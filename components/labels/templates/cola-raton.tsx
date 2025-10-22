"use client"
import React from "react"
import type { LabelTemplate } from "@/lib/labels/types"
import { escapeHTML, money } from "@/lib/labels/utils"

export const ColaRaton: LabelTemplate = {
  id: "cola-raton",
  name: "Cola de ratón (60×25.4 mm)",
  width: 60,
  height: 25.4,
  css: (w, h /* pad */) => `
    @page{size:${w}mm ${h}mm; margin: 0; padding: 0;}

    html,body{}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family: "Arial";-webkit-print-color-adjust:exact;print-color-adjust:exact}

    .p{
      width:${w}mm;height:${h}mm;
      padding-top:1mm;
      page-break-after:always;
      display:grid;
      grid-template-columns:repeat(2,1fr);
      grid-template-rows:repeat(2,1fr);
      font-size:8px;
      align-items:stretch;justify-items:stretch;
    }
    .p:last-child{page-break-after:auto}

    /* Q1 arriba derecha; Q3 abajo derecha */
    .q1{
      grid-area:1 / 2 / 2 / 3;
      width:30mm;height:10.7mm;
    }
    
    /* Área del código de barras */
    .q3{
      grid-area:2 / 2 / 3 / 3;
      margin:0 auto;
      width:26mm;
      height:10.7; 
      margin-top:2mm;
      display:flex;
      align-items:center;
      justify-content:center;
      overflow:hidden;
    }

    /* Contenedor fill */
    .bc-fit{
      width:100%;
      height:100%;
      display:flex;
      align-items:center;
      justify-content:center;
    }
    .desc{
      text-align:left;
      grid-area:1/1/3/4; 
      font-size:7px;
      margin-top:0mm; 
    }
    /* SVG ocupa todo el contenedor */
    .bc{
      display:flex;
      width:100%;
      height:100%;
    }
  `,
  renderHTML: (a) => `
    <div class="p">
      <div class="q1" style="display:grid;grid-template-columns:repeat(3,1fr);padding: 1mm; gap:.5mm;">
        <div class="desc">${escapeHTML(a.nombre)}</div>

        <div style="font-weight:bold;text-align:left;font-size:6px;grid-area:3/1/4/2; margin:0; padding:0; letter-spacing.5px;">${escapeHTML(a.codigo)}</div>

        <div style="font-weight:700;text-align:left;font-size:6px;grid-area:4/1/5/2; margin:0; padding:0;">${escapeHTML(a.unidad)}</div>

        <div style="font-weight:800;text-align:left;font-size:6px;grid-area:5/1/6/2; margin:0; padding:0;">${escapeHTML(a.estatus ?? "-")}</div>

        <div style="font-weight:700;text-align:right;font-size:6px;grid-area:3/2/4/4; margin:0; padding:0;">${escapeHTML(a.fecha)}</div>
        <div style="font-weight:800;text-align:center;grid-area:4/2/5/4; margin:0; padding:0;">${escapeHTML(money(a.precio))}</div>
        <div style="font-weight:800;text-align:right;font-size:6px;grid-area:5/2/6/4; margin:0; padding:0;"> Distr: ${escapeHTML(money(a.distribuidor))}</div>
      </div>

      <div class="q3">
        <div class="bc-fit">
          <svg class="bc jsb" data-code="${escapeHTML(a.codigo)}" style="width:100%; height:100%;"></svg>
        </div>
      </div>
    </div>`,
  preview: (a) => (
    <div
      className="p"
      style={{
        // Estructura general como en renderHTML/css
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gridTemplateRows: "repeat(2, 1fr)",
        alignItems: "stretch",
        justifyItems: "stretch",
        fontSize: "8px",
        width: "60mm",
        height: "25.4mm",
        paddingTop: "1mm",
      }}
    >
      {/* Q1: arriba derecha */}
      <div
        className="q1"
        style={{
          gridArea: "1 / 2 / 2 / 3",
          width: "30mm",
          height: "10.7mm",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: ".5mm",
          padding: "1mm",
        }}
      >
        {/* Descripción: ocupa 1/1/3/4 y 7px */}
        <div
          className="desc"
          style={{
            gridArea: "1 / 1 / 3 / 4",
            textAlign: "left",
            fontSize: "7px",
            marginTop: "0mm",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={a.nombre}
          dangerouslySetInnerHTML={{ __html: escapeHTML(a.nombre) }}
        />

        {/* Código */}
        <div
          style={{
            gridArea: "3 / 1 / 4 / 2",
            fontWeight: 700,
            textAlign: "left",
            fontSize: "6px",
            margin: 0,
            padding: 0,
            letterSpacing: ".5px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          dangerouslySetInnerHTML={{ __html: escapeHTML(a.codigo) }}
        />

        {/* Unidad */}
        <div
          style={{
            gridArea: "4 / 1 / 5 / 2",
            fontWeight: 700,
            textAlign: "left",
            fontSize: "6px",
            margin: 0,
            padding: 0,
          }}
          dangerouslySetInnerHTML={{ __html: escapeHTML(a.unidad) }}
        />

        {/* Estatus */}
        <div
          style={{
            gridArea: "5 / 1 / 6 / 2",
            fontWeight: 800,
            textAlign: "left",
            fontSize: "6px",
            margin: 0,
            padding: 0,
          }}
          dangerouslySetInnerHTML={{ __html: escapeHTML(a.estatus ?? "-") }}
        />

        {/* Fecha */}
        <div
          style={{
            gridArea: "3 / 2 / 4 / 4",
            textAlign: "right",
            fontSize: "6px",
            margin: 0,
            padding: 0,
          }}
          dangerouslySetInnerHTML={{ __html: escapeHTML(a.fecha) }}
        />

        {/* Precio */}
        <div
          style={{
            gridArea: "4 / 2 / 5 / 4",
            fontWeight: 800,
            textAlign: "center",
            margin: 0,
            padding: 0,
          }}
          dangerouslySetInnerHTML={{ __html: escapeHTML(money(a.precio)) }}
        />

        {/* Distribuidor */}
        <div
          style={{
            gridArea: "5 / 2 / 6 / 4",
            textAlign: "right",
            fontSize: "6px",
            margin: 0,
            padding: 0,
          }}
          dangerouslySetInnerHTML={{
            __html: `Distr: ${escapeHTML(money(a.distribuidor))}`,
          }}
        />
      </div>

      {/* Q3: abajo derecha (código de barras) */}
      <div
        className="q3"
        style={{
          gridArea: "2 / 2 / 3 / 3",
          margin: "0 auto",
          width: "26mm",
          height: "10.7mm",
          marginTop: "2mm",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div
          className="bc-fit"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* SVG que JsBarcode llenará en preview */}
          <svg
            className="bc jsb"
            data-code={a.codigo}
            style={{ width: "100%", height: "100%", display: "flex" }}
          />
        </div>
      </div>
    </div>
  ),

}

export default ColaRaton
