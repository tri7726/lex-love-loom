const fs = require('fs');
let code = fs.readFileSync('src/pages/KanjiWorksheet.tsx', 'utf8');

// 1. Error Boundary at top
if (!code.includes('class KanjiErrorBoundary')) {
  code = code.replace('/* ──────── Types ──────── */', '/* ──────── Error Boundary ──────── */\nclass KanjiErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {\n  state = { hasError: false };\n  static getDerivedStateFromError() { return { hasError: true }; }\n  componentDidCatch(error: any) { console.error("Kanji SVG Error:", error); }\n  render() {\n    if (this.state.hasError) return <div style={{padding: 20, marginBottom: 22, color: "#ef4444", backgroundColor: "#fef2f2", border: "1px dashed #f87171", borderRadius: 8, fontSize: 12}}>⚠️ Lỗi hiển thị Kanji (Không có dữ liệu nét chữ chuẩn). Vui lòng thử đổi Nguồn nét viết.</div>;\n    return this.props.children;\n  }\n}\n\n/* ──────── Types ──────── */');
}

// 2. chunkEntries
if (!code.includes('const chunkEntries')) {
  code = code.replace('const PrintSheet = React.forwardRef', '/* ──────── Auto Pagination ──────── */\nconst chunkEntries = (entries: KanjiEntry[], s: SheetSettings) => {\n  if (s.layoutMode === "onePerPage") return entries.map(e => [e]);\n  const ph = PAPER_HEIGHTS[s.paperSize];\n  const maxH = ph - 72;\n  const chunks: KanjiEntry[][] = [];\n  let currentChunk: KanjiEntry[] = [];\n  let currentHeight = 0;\n  entries.forEach(e => {\n    let rowH = s.cellSize + 22;\n    if (s.showHanViet || s.showMeaning || (s.showStrokeCount && !s.showStrokeOrder)) rowH += 18;\n    if (s.showReadings && (e.onReading || e.kunReading)) rowH += 18;\n    if (s.showStrokeOrder) rowH += 30;\n    if (s.showVocabRows) rowH += 80;\n    if (currentHeight + rowH > maxH && currentChunk.length > 0) {\n      chunks.push(currentChunk);\n      currentChunk = [e];\n      currentHeight = rowH;\n    } else {\n      currentChunk.push(e);\n      currentHeight += rowH;\n    }\n  });\n  if (currentChunk.length > 0) chunks.push(currentChunk);\n  return chunks;\n};\n\nconst PrintSheet = React.forwardRef');
}

// 3. Update PrintSheet correctly
code = code.replace(/const w=s\.cellSize\*\(\s*1\s*\+\s*s\.ghostCells\s*\+\s*s\.practiceCells\s*\)\s*\+\s*100;[\s\S]*?\{entries\.map[\s\S]*?<\/div>\s*\);\s*}\);/, 
  'const chunks = chunkEntries(entries, s);\n  const w=s.cellSize*(1+s.ghostCells+s.practiceCells)+100;\n  return(\n    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px", backgroundColor: "#e2e8f0", padding: "24px" }}>\n      {chunks.map((chunk, idx) => (\n        <div key={idx} className="print-page" style={{ width:`${w}px`,backgroundColor:SHEET_THEMES[s.sheetTheme],padding:"36px 50px",fontFamily:"Arial,sans-serif",boxSizing:"border-box", position: "relative" }}>\n          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22,borderBottom:"2px solid #111",paddingBottom:8 }}>\n            <div>\n              <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "0.15em" }}>{title || "LUYỆN VIẾT KANJI"}</div>\n              <div style={{ fontSize:9,color:"#aaa",marginTop:2 }}>Tập viết Kanji · LexLoveLoom</div>\n            </div>\n            <div style={{ fontSize:10,color:"#999",textAlign:"right",lineHeight:1.8 }}>\n              <div>Họ tên: ______________________</div>\n              <div>Ngày: {new Date().toLocaleDateString("vi-VN")}</div>\n            </div>\n          </div>\n          {chunk.map((e, i) => (\n            <KanjiErrorBoundary key={e.character + i}>\n              <WorksheetRow entry={e} s={s}/>\n            </KanjiErrorBoundary>\n          ))}\n          {s.showPageFooter&&<div style={{ marginTop:10,paddingTop:8,borderTop:"1px solid #eee",fontSize:9,color:"#ccc",textAlign:"center" }}>Kaizen Kanji Coach · LexLoveLoom · Trang {idx+1}/{chunks.length}</div>}\n        </div>\n      ))}\n    </div>\n  );\n});'
);

// 4. Also make sure exportRef is there.
if (!code.includes('const exportRef = useRef')) {
  code = code.replace('const ref = useRef<HTMLDivElement>(null);', 'const ref = useRef<HTMLDivElement>(null);\n  const exportRef = useRef<HTMLDivElement>(null);');
}

fs.writeFileSync('src/pages/KanjiWorksheet.tsx', code);
console.log('Update completed successfully.');
