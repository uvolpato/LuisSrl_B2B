from fpdf import FPDF
import re, os

FONT_DIR = r"C:\Windows\Fonts"

class SpecPDF(FPDF):
    def __init__(self):
        super().__init__('P', 'mm', 'A4')
        self.set_auto_page_break(auto=True, margin=20)
        self.set_margins(18, 12, 18)
        self.lm = 18
        self.rm = 18
        self.cw = 210 - self.lm - self.rm
        
        self.add_font('Calibri', '', os.path.join(FONT_DIR, 'calibri.ttf'))
        self.add_font('Calibri', 'B', os.path.join(FONT_DIR, 'calibrib.ttf'))
        self.add_font('Calibri', 'I', os.path.join(FONT_DIR, 'calibrii.ttf'))
        self.add_font('Consolas', '', os.path.join(FONT_DIR, 'consola.ttf'))
        self.F = 'Calibri'
        self.M = 'Consolas'
        
    def header(self):
        if self.page_no() > 1:
            self.set_font(self.F, 'I', 7)
            self.set_text_color(150, 150, 150)
            self.cell(85, 4, self.clean('Specifiche funzionali B2B Luis S.r.l. - bozza 1.3'), new_x="LMARGIN", new_y="NEXT")
            self.set_x(self.lm)
            self.cell(0, 4, f'Pag. {self.page_no()}', align='R')
            self.ln(5)
            self.set_draw_color(200, 200, 200)
            self.line(self.lm, self.get_y(), 210 - self.rm, self.get_y())
            self.ln(4)
    
    def check_page(self, needed):
        if self.get_y() + needed > 275:
            self.add_page()
    
    def title_page(self):
        self.add_page()
        self.ln(45)
        self.set_font(self.F, 'B', 28)
        self.set_text_color(26, 58, 92)
        self.set_x(self.lm)
        self.multi_cell(self.cw, 12, self.clean('Piattaforma B2B\nLuis S.r.l.'), align='C')
        self.set_draw_color(212, 149, 106)
        self.set_line_width(0.8)
        self.line(self.lm + 40, self.get_y(), 210 - self.lm - 40, self.get_y())
        self.ln(8)
        self.set_font(self.F, '', 14)
        self.set_text_color(80, 80, 80)
        self.set_x(self.lm)
        self.cell(self.cw, 8, self.clean('Specifiche funzionali - Portale e-commerce B2B'), align='C')
        self.ln(10)
        self.set_font(self.F, '', 11)
        self.set_text_color(100, 100, 100)
        self.set_x(self.lm)
        self.multi_cell(self.cw, 6, self.clean("Luis S.r.l. - Via F. Bellafino 28/30, 24126 Bergamo\nSettore: commercio all'ingrosso di articoli per fioristi e garden\nVersione: bozza 1.3 - 5 giugno 2026"), align='C')
        self.ln(10)
        self.set_font(self.F, 'I', 9)
        self.set_text_color(150, 150, 150)
        self.set_x(self.lm)
        self.multi_cell(self.cw, 5, self.clean('I prezzi sul portale si intendono IVA esclusa, coerentemente con la natura B2B (rivendita).'), align='C')
        
    def h2(self, title):
        self.check_page(20)
        self.ln(3)
        self.set_x(self.lm)
        self.set_font(self.F, 'B', 15)
        self.set_text_color(26, 58, 92)
        self.multi_cell(self.cw, 7, self.clean(title))
        self.set_draw_color(192, 208, 224)
        self.set_line_width(0.4)
        self.line(self.lm, self.get_y(), 210 - self.rm, self.get_y())
        self.ln(2)
    
    def h3(self, title):
        self.check_page(15)
        self.ln(2)
        self.set_x(self.lm)
        self.set_font(self.F, 'B', 12)
        self.set_text_color(42, 90, 140)
        self.multi_cell(self.cw, 6, self.clean(title))
        self.ln(1)
    
    def h4(self, title):
        self.check_page(12)
        self.ln(1)
        self.set_x(self.lm)
        self.set_font(self.F, 'B', 11)
        self.set_text_color(58, 106, 156)
        self.multi_cell(self.cw, 5.5, self.clean(title))
    
    def clean(self, t):
        t = t.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '--')
        t = t.replace('\u2192', '->').replace('\u2190', '<-')
        t = t.replace('\u2666', '>')
        return t
    
    def p(self, text):
        self.set_x(self.lm)
        self.set_font(self.F, '', 9.5)
        self.set_text_color(34, 34, 34)
        self.multi_cell(self.cw, 5, self.clean(text))
    
    def bullet(self, text):
        self.set_x(self.lm)
        self.set_font(self.F, '', 9.5)
        self.set_text_color(34, 34, 34)
        self.multi_cell(self.cw, 5, self.clean('  \u2022  ' + text))
    
    def numbered(self, num, text):
        self.set_x(self.lm)
        self.set_font(self.F, '', 9.5)
        self.set_text_color(34, 34, 34)
        self.multi_cell(self.cw, 5, self.clean(f'  {num}.  {text}'))
    
    def note(self, text):
        self.set_x(self.lm)
        self.set_font(self.F, 'I', 8.5)
        self.set_text_color(100, 100, 100)
        self.multi_cell(self.cw, 4.5, self.clean(text))
    
    def hr(self):
        self.ln(2)
        self.set_draw_color(200, 200, 200)
        self.set_line_width(0.2)
        self.line(self.lm, self.get_y(), 210 - self.rm, self.get_y())
        self.ln(2)
    
    def code(self, text):
        self.ln(2)
        lines = [l for l in text.split('\n') if l.strip()]
        # Replace box drawing chars with ASCII
        cleaned = []
        for l in lines:
            l = l.replace('\u2500', '-').replace('\u2502', '|').replace('\u2514', '+')
            l = l.replace('\u251c', '+').replace('\u252c', '+').replace('\u2534', '+')
            l = l.replace('\u256d', '+').replace('\u256e', '+').replace('\u2570', '+')
            l = l.replace('\u256f', '+')
            cleaned.append(l)
        lines = cleaned
        line_h = 4
        pad = 3
        h = len(lines) * line_h + pad * 2
        if self.get_y() + h > 270:
            self.add_page()
        self.set_fill_color(240, 242, 245)
        self.set_draw_color(208, 212, 216)
        self.set_font(self.M, '', 7.5)
        self.set_text_color(34, 34, 34)
        self.set_line_width(0.3)
        x = self.lm
        self.rect(x, self.get_y(), self.cw, h, 'DF')
        self.set_x(x + pad)
        for line in lines:
            # Truncate if too long for code block
            max_chars = int((self.cw - pad * 2) / 3.5)
            if len(line) > max_chars:
                line = line[:max_chars - 3] + '...'
            self.cell(0, line_h, line, new_x="LMARGIN", new_y="NEXT")
            self.set_x(x + pad)
        self.set_x(self.lm)
        self.ln(3)
    
    def table(self, headers, data):
        self.ln(2)
        self.set_font(self.F, 'B', 8)
        h = len(headers)
        
        # Calculate column widths based on content
        n = len(headers)
        cw = [self.cw / n] * n
        
        # Calculate row height needed
        lh = 5.5  # line height per row
        row_h = lh
        
        # Estimate total table height
        th = (len(data) + 1) * row_h + 4
        if self.get_y() + th > 275:
            self.add_page()
        
        # Header row
        self.set_fill_color(26, 58, 92)
        self.set_text_color(255, 255, 255)
        self.set_draw_color(180, 180, 180)
        self.set_font(self.F, 'B', 8)
        for i, hdr in enumerate(headers):
            self.cell(cw[i], row_h, hdr, 1, 0, 'C', True)
        self.ln()
        
        # Data rows
        self.set_font(self.F, '', 8)
        self.set_text_color(34, 34, 34)
        for ri, row in enumerate(data):
            if ri % 2 == 0:
                self.set_fill_color(245, 247, 250)
            else:
                self.set_fill_color(255, 255, 255)
            # Truncate cell text if too long
            for ci, ct in enumerate(row):
                txt = str(ct)
                max_ch = int(cw[ci] / 2.2)
                if len(txt) > max_ch:
                    txt = txt[:max_ch - 2] + '..'
                self.cell(cw[ci], row_h, txt, 1, 0, 'L', True)
            self.ln()
        self.ln(2)


with open("specifiche-b2b-luis.md", "r", encoding="utf-8") as f:
    md = f.read()

pdf = SpecPDF()
pdf.title_page()

lines = md.split('\n')
in_code = False
code_text = []
in_table = False
table_data = []

i = 0
while i < len(lines):
    raw = lines[i]
    
    if raw.strip().startswith('```'):
        if in_code:
            pdf.code('\n'.join(code_text))
            code_text = []
            in_code = False
        else:
            in_code = True
        i += 1
        continue
    if in_code:
        code_text.append(raw)
        i += 1
        continue
    
    if raw.startswith('> Aggiornamento'):
        i += 1
        continue
    
    if raw.startswith('# ') and '##' not in raw:
        i += 1
        continue
    
    if raw.startswith('## ') and '###' not in raw:
        pdf.h2(raw[3:])
        i += 1
        continue
    if raw.startswith('### ') and '####' not in raw:
        pdf.h3(raw[4:])
        i += 1
        continue
    if raw.startswith('#### '):
        pdf.h4(raw[5:])
        i += 1
        continue
    
    img_match = re.match(r'^!\[(.*?)\]\((.+?)\)\*?$', raw.strip())
    if img_match:
        alt = img_match.group(1)
        src = img_match.group(2)
        caption = raw.strip().lstrip('![').split('](')[0]
        if os.path.exists(src):
            pdf.check_page(80)
            # Get image dimensions
            from PIL import Image as PILImage
            with PILImage.open(src) as im:
                iw, ih = im.size
            # Fit to page width
            max_w = pdf.cw
            max_h = 100
            ratio = min(max_w / iw, max_h / ih)
            dw = iw * ratio
            dh = ih * ratio
            pdf.set_x(pdf.lm)
            pdf.image(src, x=pdf.lm, w=dw, h=dh)
            pdf.ln(dh + 4)
            pdf.set_font(pdf.F, 'I', 7.5)
            pdf.set_text_color(100, 100, 100)
            pdf.set_x(pdf.lm)
            pdf.multi_cell(pdf.cw, 4, pdf.clean(caption))
            pdf.ln(2)
        i += 1
        continue
    
    if raw.startswith('> '):
        pdf.note(raw[2:])
        i += 1
        continue
    
    if raw.strip() in ('---', '___', '***'):
        if in_table:
            in_table = False
            if table_data:
                pdf.table(table_data[0], table_data[1:])
            table_data = []
        pdf.hr()
        i += 1
        continue
    
    if '|' in raw and raw.strip().startswith('|'):
        cells = [c.strip() for c in raw.split('|')[1:-1]]
        if re.match(r'^[\s\-:|]+$', raw.strip()):
            i += 1
            continue
        if not in_table:
            in_table = True
            table_data = [cells]
        else:
            table_data.append(cells)
        i += 1
        continue
    elif in_table:
        if table_data:
            pdf.table(table_data[0], table_data[1:])
        table_data = []
        in_table = False
        continue
    
    if raw.strip().startswith('- ') or raw.strip().startswith('* '):
        pdf.bullet(raw.strip()[2:])
        i += 1
        continue
    
    m = re.match(r'^(\s*)(\d+)\.\s+(.*)', raw)
    if m:
        pdf.numbered(m.group(2), m.group(3))
        i += 1
        continue
    
    if not raw.strip():
        i += 1
        continue
    
    pdf.p(raw)
    i += 1

if in_table and table_data:
    pdf.table(table_data[0], table_data[1:])

pdf.output("specifiche-b2b-luis.pdf")
print("PDF generato: specifiche-b2b-luis.pdf")
