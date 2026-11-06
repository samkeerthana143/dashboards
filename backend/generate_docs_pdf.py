import re
import os
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_pdf():
    doc_path = r"C:\Users\keert\.gemini\antigravity\brain\f95d51fd-bdac-4f15-959c-b0d392c591fe\PROJECT_DOCUMENTATION.md"
    with open(doc_path, "r", encoding="utf-8") as f:
        text = f.read()

    output_pdf = os.path.abspath(os.path.join(os.path.dirname(__file__), "app", "static", "Arshith_Connect_Project_Documentation.pdf"))
    os.makedirs(os.path.dirname(output_pdf), exist_ok=True)
    
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    output_pdf_root = os.path.join(workspace_root, "Arshith_Connect_Project_Documentation.pdf")
    
    # Also save in user Downloads directly
    downloads_path = os.path.expanduser("~/Downloads/Arshith_Connect_Project_Documentation.pdf")

    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    primary_color = colors.HexColor("#0b3d2b")
    secondary_color = colors.HexColor("#0f766e")
    text_dark = colors.HexColor("#1e293b")

    title_style = ParagraphStyle(
        "DocTitle",
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        "DocSubTitle",
        fontName="Helvetica-Oblique",
        fontSize=10,
        leading=14,
        textColor=secondary_color,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        "H1",
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=primary_color,
        spaceBefore=12,
        spaceAfter=4,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        "H2",
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=secondary_color,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        "Body",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=text_dark,
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        "Bullet",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=text_dark,
        leftIndent=12,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        "Code",
        fontName="Courier",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f8fafc"),
        borderColor=colors.HexColor("#cbd5e1"),
        borderWidth=0.5,
        borderPadding=5,
        spaceAfter=6
    )

    def format_inline_md(s):
        s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
        s = re.sub(r"\*(.+?)\*", r"<i>\1</i>", s)
        s = re.sub(r"`(.+?)`", r'<font face="Courier" color="#0f766e">\1</font>', s)
        return s

    story = []
    story.append(Paragraph("Arshith Connect — Total Project Documentation", title_style))
    story.append(Paragraph("Enterprise Human Resource Management System (HRMS) & Agile Project Operations Suite", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=10))

    lines = text.split("\n")
    in_code = False
    code_lines = []

    for line in lines:
        sline = line.strip()
        if sline.startswith("```"):
            if in_code:
                in_code = False
                code_text = "<br/>".join([
                    cl.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace(" ", "&nbsp;")
                    for cl in code_lines
                ])
                story.append(Paragraph(code_text, code_style))
                code_lines = []
            else:
                in_code = True
                code_lines = []
            continue
        
        if in_code:
            code_lines.append(line)
            continue
            
        if not sline:
            continue
            
        if sline.startswith("# "):
            continue
        elif sline.startswith("## "):
            heading = sline[3:].replace("*", "").strip()
            story.append(Spacer(1, 4))
            story.append(Paragraph(format_inline_md(heading), h1_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0"), spaceAfter=4))
        elif sline.startswith("### "):
            subheading = sline[4:].replace("*", "").strip()
            story.append(Paragraph(format_inline_md(subheading), h2_style))
        elif sline.startswith("- ") or sline.startswith("* "):
            content = sline[2:].strip()
            story.append(Paragraph("&bull; " + format_inline_md(content), bullet_style))
        elif re.match(r"^\d+\.\s", sline):
            story.append(Paragraph(format_inline_md(sline), bullet_style))
        elif sline.startswith("|") and sline.endswith("|"):
            cells = [c.strip() for c in sline.split("|")[1:-1]]
            if cells and not all(c.startswith("---") or c.startswith(":---") for c in cells):
                row_text = " &bull; ".join([f"<b>{c}</b>" if idx == 0 else c for idx, c in enumerate(cells) if c])
                story.append(Paragraph(format_inline_md(row_text), bullet_style))
        elif sline.startswith("---"):
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0"), spaceAfter=4))
        else:
            story.append(Paragraph(format_inline_md(sline), body_style))

    doc.build(story)
    
    try:
        shutil.copyfile(output_pdf, output_pdf_root)
    except Exception as e:
        print("Root copy note:", e)
        
    try:
        shutil.copyfile(output_pdf, downloads_path)
    except Exception as e:
        print("Downloads copy note:", e)

    print("SUCCESS")
    print(f"File 1: {output_pdf}")
    print(f"File 2: {output_pdf_root}")
    print(f"File 3: {downloads_path}")
    print(f"Size: {os.path.getsize(output_pdf)} bytes")

if __name__ == "__main__":
    generate_pdf()

