"use client"

import { useEffect, useState, useRef } from "react"

// Global image loading queue
class ImageLoadQueue {
  private queue: Array<() => void> = []
  private loading = 0
  private maxConcurrent = 4 // Limit concurrent image loads

  add(loadFn: () => void) {
    this.queue.push(loadFn)
    this.processQueue()
  }

  private processQueue() {
    while (this.loading < this.maxConcurrent && this.queue.length > 0) {
      const loadFn = this.queue.shift()
      if (loadFn) {
        this.loading++
        loadFn()
      }
    }
  }

  complete() {
    this.loading--
    this.processQueue()
  }
}

const imageQueue = new ImageLoadQueue()

// In-memory cache for loaded images
const imageCache = new Map<string, string>()

export function useOptimizedImage(src: string | null, enabled = true) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!src || !enabled) return

    // Check cache first
    if (imageCache.has(src)) {
      setImageUrl(imageCache.get(src)!)
      setLoading(false)
      return
    }

    // Set up Intersection Observer for lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Element is visible, add to load queue
            imageQueue.add(() => {
              setLoading(true)
              loadImage(src)
            })
            // Stop observing once we've started loading
            if (observerRef.current && elementRef.current) {
              observerRef.current.unobserve(elementRef.current)
            }
          }
        })
      },
      {
        rootMargin: "200px", // Start loading 200px before entering viewport
        threshold: 0.01,
      },
    )

    if (elementRef.current) {
      observerRef.current.observe(elementRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [src, enabled])

  const loadImage = (url: string) => {
    const img = new Image()
    imgRef.current = img

    img.onload = () => {
      imageCache.set(url, url)
      setImageUrl(url)
      setLoading(false)
      setError(false)
      imageQueue.complete()
    }

    img.onerror = () => {
      setLoading(false)
      setError(true)
      imageQueue.complete()
    }

    img.src = url
  }

  return {
    imageUrl,
    loading,
    error,
    elementRef, 
  }
}
