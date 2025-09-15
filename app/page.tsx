"use client"

import { useEffect, useState, useRef } from "react"
import { HeroSection } from "@/components/sections/hero-section"
import { BenefitsSection } from "@/components/sections/benefits-section"
import { HowItWorksSection } from "@/components/sections/how-it-works-section"
import { PricingSection } from "@/components/sections/pricing-section"
import { HighlightsSection } from "@/components/sections/highlights-section"
import { DifferentiatorsSection } from "@/components/sections/differentiators-section"
import { ContactSection } from "@/components/sections/contact-section"
import { FooterSection } from "@/components/sections/footer-section"
export default function KRKNLanding() {
  const [isVisible, setIsVisible] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    setIsVisible(true)

    const handleScroll = () => {
      const y = window.scrollY
      setScrollY(y)
      document.documentElement.style.setProperty("--scroll-y", y.toString())
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed")
            observerRef.current?.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    )

    const scrollElements = document.querySelectorAll(".scroll-reveal, .reveal-on-scroll")
    scrollElements.forEach((el) => observerRef.current?.observe(el))

    return () => {
      window.removeEventListener("scroll", handleScroll)
      observerRef.current?.disconnect()
    }
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden cyber-grid performance-optimized gpu-accelerated">
      <HeroSection isVisible={isVisible} />
      <BenefitsSection />
      <HowItWorksSection />
      <PricingSection />

      <HighlightsSection />
      <DifferentiatorsSection />
      <ContactSection />
      <FooterSection />
    </div>
  )
}
