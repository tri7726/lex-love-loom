const fs = require('fs');
let code = fs.readFileSync('src/pages/KanjiWorksheet.tsx', 'utf8');

const exportPDFRegex = /const exportPDF = async \(\) => \{[\s\S]*?finally\{\s*setExporting\(false\);\s*\}\s*\};/;

const newExportPDF = `const exportPDF = async () => {
    if(!exportRef.current||!list.length)return;
    setExporting(true);
    try{
      const { jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      toast({title: '⏳ Đang chuẩn bị xuất PDF...', description: 'Vui lòng chờ trong giây lát.'});
      await ensureFonts();
      
      const el = exportRef.current;
      el.style.opacity = '1';
      await new Promise(r=>setTimeout(r, 500));
      
      const pages = el.querySelectorAll('.print-page');
      if (pages.length === 0) throw new Error("No pages generated");
      
      const pw=PAPER_WIDTHS[s.paperSize], ph=PAPER_HEIGHTS[s.paperSize];
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[pw,ph]});
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage([pw, ph]);
        const pageEl = pages[i] as HTMLElement;
        const cv=await (html2canvas as any)(pageEl,{
          useCORS:true,
          allowTaint:false,
          backgroundColor:SHEET_THEMES[s.sheetTheme],
          logging:false,
          scale: 2,
          windowWidth: pageEl.scrollWidth + 100,
          windowHeight: pageEl.scrollHeight + 100,
          onclone:(doc: Document)=>{const l=doc.createElement('link');l.rel='stylesheet';l.href=NOTO_URL;doc.head.appendChild(l);}
        });
        const iw=pw,ih=(cv.height*pw)/cv.width;
        pdf.addImage(cv.toDataURL('image/jpeg', 0.95),'JPEG',0,0,iw,ih);
      }
      
      el.style.opacity = '0';
      pdf.save(\`kanji-ws-\${Date.now()}.pdf\`);
      toast({title:'✅ Đã tải PDF!',description:\`\${list.length} Kanji · \${s.paperSize.toUpperCase()} · \${pages.length} Trang\`});
    }catch(e){console.error(e);toast({title:'Lỗi xuất PDF',variant:'destructive'});}
    finally{setExporting(false);}
  };`;

code = code.replace(exportPDFRegex, newExportPDF);
fs.writeFileSync('src/pages/KanjiWorksheet.tsx', code);
console.log('exportPDF updated successfully.');
