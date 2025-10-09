// Utility functions extracted from etiquetador_paquetes for printing labels

type TipoEtiqueta = "factura" | "traspaso" | "puntoVenta"

type PaqItem = {
  id: string
  folio: string
  cliente: string
  direccion: string
  colonia: string
  ciudad: string
  cp: string
  peso: number
  fecha: string
  quantity: number
  sucursal: string
  tipo: string
  tipoClass: string
  templateId: string
}

type Template = {
  id: string
  name: string
  width: number
  height: number
  css: (w: number, h: number) => string
  renderHTML: (a: PaqItem, partIndex?: number, partTotal?: number) => string
}

function escapeHTML(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const todayMX = () =>
  new Date().toLocaleDateString("es-MX", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

// Template definitions
const baseTemplate: Template = {
  id: "etiqueta_facturas",
  name: "Factura",
  width: 101,
  height: 101,
  css: (w: number, h: number) => `
     @page{size:${w}mm ${h}mm;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial, Helvetica, sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  .p{
    width:${w}mm;height:${h}mm;
    display:block;
    page-break-after:always; break-after:page;
    page-break-inside:avoid; break-inside:avoid;
  }
  .p:last-child{page-break-after:auto}

  .l{width:${w}mm;height:${h}mm;padding:2mm;display:flex}
  .g{
    width:100%;height:100%;
    display:grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows:
      14mm   
      14mm    
      14mm   
      14mm    
      30mm;  
    gap:2px 6px;
    font-size: 4mm;     
    line-height: 1.15;
    position:relative;
    align-content:start;  
  }

  .cabecera{
    grid-area:1 / 1 / 2 / 4;
    display:flex; align-items:center; justify-content:space-between; gap:4mm;
    border-bottom:1px dashed #000; padding-bottom:1mm;
  }
  .cabecera img{ height:10mm; max-width:48%; object-fit:contain; display:block; }
  .fecha{ font-size:3mm; }

  .cliente{
    grid-area:2 / 1 / 3 / 4;
    font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        padding: 1mm;
  }
  .dir{
    grid-area:3 / 1 / 4 / 4;
    white-space:normal; overflow:hidden; text-overflow:ellipsis;
    line-height:1.15;
    padding: 1mm;
  }

  .peso{
  padding-right: 2mm;
    grid-area:4 / 3 / 5 / 4;
    align-self:center; justify-self:end;
    display:flex; flex-direction: column; justify-content:end;
    font-weight:700;
       span{
    text-align: right;
    font-size: 13px;
    }
  }

  .paq{
   grid-area:4 / 1 / 5 / 3;
    justify-self:start; align-self:center;
    font-size:3mm; font-weight:700; padding:1mm 2mm;
    display:flex; flex-direction: column; justify-content:center;
    
    border-radius:2px; line-height:1;

    span{
    text-align: center;
    font-size: 25px;
    }
  }

  .FolioQR{
    grid-area:5 / 1 / 6 / 4;   
    padding-top:1mm;
    display:flex; 
    flex-direction:column; 
    gap:2mm;
    justify-content: center;
    width: 90mm;
    margin: 0 auto;
  }

  .folio{
    width:100%;
    font-weight:bold; font-size:4mm; text-align:center;
    display:flex; flex-direction:row; justify-content:space-between; align-items:center;
  }

  .ruta,.anden{
    border:1px solid #000; width:10mm; height:10mm;
    font-size:4mm; display:flex; flex-direction:column; align-items:center; justify-content:center;
  }
  .ruta strong,.anden strong{ font-size:2.2mm; }

  .bc{
    width:100%;
    height:18mm;      
    display:block;
  }
  `,
  renderHTML: (a: PaqItem, partIndex = 1, partTotal = 1) => `
    <div class="p"><div class="l"><div class="g" style="border:1px solid #000; margin-top:2mm;">
      <div class="cabecera" style="border-bottom:1px dashed #000;display:flex;flex-direction:row;align-items:center;position:relative;">
        
        <img src="/Fyttsa/FYTTSA APLICACIONES LOGO (2)-06.png" alt="Logo derecha" style="height:60px;"/>
       <span style="font-size:10px;">CARRETERA (CARR.) FEDERAL MÉXICO TEPEXPAN KM 32.5 INT:1, LOS ÁNGELES TOTOLCINGO, ACOLMAN, 55885</span>
      </div>
      
      <div class="cliente">${escapeHTML(a.cliente)}</div>
      <div class="dir">${escapeHTML(a.direccion)} ${escapeHTML(`${a.ciudad}${a.cp ? " CP " + a.cp : ""}`)}</div>
      <div class="peso"><span>Peso</span><span>${escapeHTML(a.peso ? `${a.peso} kg` : "")}</span></div>
      <div class="SD" style="grid-area: 4 / 2 / 5 / 3; font-size:30px; text-align:center; display:flex; justify-content:center; align-items:center;">SD</div>
    <div class="paq"><span >PAQ: </span>
    <span>${partIndex}/${partTotal}</span></div>
      <div class="FolioQR">
        <div class="folio">
          <div class="anden"><span></span><strong></strong></div>
          <span style="font-size:35px;">${escapeHTML(a.folio)}</span>
          <div class="ruta"><span></span><strong></strong></div>
        </div>
        <svg class="bc jsb" data-code="${escapeHTML(a.folio)}"></svg>
         <div class="footer" style="width:95%; display: flex; flex-direction: row;justify-content: space-between !important;align-items: center; position:absolute; bottom:1mm;"> 
      <img src="/powered by.png" alt="Logo izquierda" style="height:15px;"/>
       <div class="fecha">${escapeHTML(a.fecha)}</div>
      </div>
      </div>
     
    </div></div></div>
  `,
}

const baseTemplate2: Template = {
  id: "etiqueta_traspaso",
  name: "Traspaso",
  width: 101,
  height: 101,
  css: baseTemplate.css,
  renderHTML: (a: PaqItem, partIndex = 1, partTotal = 1) => `
    <div class="p"><div class="l"><div class="g" style="border:1px solid #000; margin-top:2mm;">
      <div class="cabecera" style="border-bottom:1px dashed #000;display:flex;flex-direction:row;align-items:center;position:relative;">
        
        <img src="/Fyttsa/FYTTSA APLICACIONES LOGO (2)-06.png" alt="Logo derecha" style="height:60px;"/>
       <span style="font-size:10px;">CARRETERA (CARR.) FEDERAL MÉXICO TEPEXPAN KM 32.5 INT:1, LOS ÁNGELES TOTOLCINGO, ACOLMAN, 55885</span>
      </div>
      
      <div class="cliente">${escapeHTML(a.sucursal)}</div>
      <div class="dir">${escapeHTML(a.direccion)} ${escapeHTML(`${a.ciudad}${a.cp ? " CP " + a.cp : ""}`)}</div>
      <div class="peso"><span>Peso</span><span>${escapeHTML(a.peso ? `${a.peso} kg` : "")}</span></div>
      <div class="SD" style="grid-area: 4 / 2 / 5 / 3; font-size:30px; text-align:center; display:flex; justify-content:center; align-items:center;">SD</div>
    <div class="paq"><span >PAQ: </span>
    <span>${partIndex}/${partTotal}</span></div>
      <div class="FolioQR">
        <div class="folio">
          <div class="anden"><span></span><strong></strong></div>
          <span style="font-size:35px;">${escapeHTML(a.folio)}</span>
          <div class="ruta"><span></span><strong></strong></div>
        </div>
        <svg class="bc jsb" data-code="${escapeHTML(a.folio)}"></svg>
         <div class="footer" style="width:95%; display: flex; flex-direction: row;justify-content: space-between !important;align-items: center; position:absolute; bottom:1mm;"> 
      <img src="/powered by.png" alt="Logo izquierda" style="height:15px;"/>
       <div class="fecha">${escapeHTML(a.fecha)}</div>
      </div>
      </div>
     
    </div></div></div>
  `,
}

const baseTemplate3: Template = {
  id: "etiqueta_puntoVenta",
  name: "Ruta",
  width: 101,
  height: 101,
  css: baseTemplate.css,
  renderHTML: (a: PaqItem, partIndex = 1, partTotal = 1) => `
    <div class="p"><div class="l"><div class="g" style="border:1px solid #000; margin-top:2mm;">
      <div class="cabecera" style="border-bottom:1px dashed #000;display:flex;flex-direction:row;align-items:center;position:relative;">
        
        <img src="/Fyttsa/FYTTSA APLICACIONES LOGO (2)-06.png" alt="Logo derecha" style="height:60px;"/>
       <span style="font-size:10px;">CARRETERA (CARR.) FEDERAL MÉXICO TEPEXPAN KM 32.5 INT:1, LOS ÁNGELES TOTOLCINGO, ACOLMAN, 55885</span>
      </div>
      
      <div class="cliente">${escapeHTML(a.cliente)}</div>
      <div class="dir">${escapeHTML(a.direccion)}, ${escapeHTML(`${a.ciudad}${a.cp ? " CP " + a.cp : ""}`)}</div>
      <div class="peso"><span>Peso</span><span>${escapeHTML(a.peso ? `${a.peso} kg` : "")}</span></div>
      <div class="SD" style="grid-area: 4 / 2 / 5 / 3; font-size:30px; text-align:center; display:flex; justify-content:center; align-items:center;">SD</div>
    <div class="paq"><span >PAQ: </span>
    <span>${partIndex}/${partTotal}</span></div>
      <div class="FolioQR">
        <div class="folio">
          <div class="anden"><span></span><strong></strong></div>
          <span style="font-size:35px;">${escapeHTML(a.folio)}</span>
          <div class="ruta"><span></span><strong></strong></div>
        </div>
        <svg class="bc jsb" data-code="${escapeHTML(a.folio)}"></svg>
         <div class="footer" style="width:95%; display: flex; flex-direction: row;justify-content: space-between !important;align-items: center; position:absolute; bottom:1mm;"> 
      <img src="/powered by.png" alt="Logo izquierda" style="height:15px;"/>
       <div class="fecha">${escapeHTML(a.fecha)}</div>
      </div>
      </div>
     
    </div></div></div>
  `,
}

const LABEL_TEMPLATES: Template[] = [baseTemplate, baseTemplate2, baseTemplate3]

const TIPO_TO_TEMPLATE_ID: Record<TipoEtiqueta, Template["id"]> = {
  factura: "etiqueta_facturas",
  traspaso: "etiqueta_traspaso",
  puntoVenta: "etiqueta_puntoVenta",
}

type PrintLabelsParams = {
  folio: string
  folioData: any
  tipoDetectado: TipoEtiqueta
  totalBoxes: number
}

export async function printLabels({ folio, folioData, tipoDetectado, totalBoxes }: PrintLabelsParams) {
  const templateId = TIPO_TO_TEMPLATE_ID[tipoDetectado] || LABEL_TEMPLATES[0].id
  const template = LABEL_TEMPLATES.find((t) => t.id === templateId) || LABEL_TEMPLATES[0]

  const dir = [
    (folioData.CALLE || folioData.nombre_calle || "").toString().trim(),
    (folioData.COLONIA || folioData.colonia || "Sin información").toString().trim(),
  ]
    .filter(Boolean)
    .join(", ")

  const ciudad = (folioData.CIUDAD || folioData.ciudad || "").toString().trim()
  const cp = (folioData.CODIGO_POSTAL || folioData.codigo_postal || "").toString().trim()
  const sucursal = (folioData.SUCURSAL || folioData.sucursal || "Sin información").toString().trim()

  const paqItem: PaqItem = {
    id: `${Date.now()}_${folio}`,
    folio: (folioData.FOLIO || folioData.folio || folio).toString().trim(),
    cliente: (folioData.CLIENTE || folioData.cliente || "CLIENTE").toString().trim(),
    direccion: dir,
    ciudad,
    cp,
    colonia: (folioData.COLONIA || folioData.colonia || "").toString().trim(),
    sucursal,
    peso: Number(folioData.PESO_EMBARQUE ?? folioData.peso_embarque ?? 0) || 0,
    fecha: todayMX(),
    quantity: totalBoxes,
    tipo: tipoDetectado,
    tipoClass: "",
    templateId,
  }

  // Generate HTML for all labels
  const pagesHTML = Array.from({ length: totalBoxes }, (_, idx) =>
    template.renderHTML(paqItem, idx + 1, totalBoxes),
  ).join("")

  const stripAtPage = (css: string) => css.replace(/@page\s*\{[^}]*\}\s*/g, "")
  const cssContent = stripAtPage(template.css(template.width, template.height))

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiquetas - ${folio}</title>

  <style>
    @page { size: ${template.width}mm ${template.height}mm; margin: 0; }

    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    ${cssContent}
  </style>

  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <script>
    window.addEventListener('load', function () {
      try {
        document.querySelectorAll('.jsb').forEach(function (el) {
          var code = el.getAttribute('data-code') || '';
          JsBarcode(el, code, { format: 'CODE128', displayValue: false, margin: 0, height: 48 });
          el.removeAttribute('width'); el.removeAttribute('height');
          el.style.width = '100%'; el.style.height = '100%';
        });
      } catch (e) {}
      setTimeout(function(){ window.print(); }, 0);
    });
  </script>
</head>
<body>
  ${pagesHTML}
</body>
</html>`

  // Create iframe and print
  const iframe = document.createElement("iframe")
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    opacity: "0",
  })
  document.body.appendChild(iframe)

  const doc = (iframe.contentDocument || (iframe as any).ownerDocument) as Document
  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => {
    try {
      document.body.removeChild(iframe)
    } catch {}
  }
  setTimeout(cleanup, 10000)
  ;(iframe.contentWindow as any)?.addEventListener?.("afterprint", cleanup)
}
