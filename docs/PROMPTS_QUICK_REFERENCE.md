# Claude Code Prompts - Quick Reference
**Jalanea ATS Build Guide**

This document provides a sequential checklist of all Claude Code prompts for building Jalanea ATS.

---

## 📋 Milestone Checklist

### Milestone 0: Foundation & Prototype (1 week)
**Goal:** Basic PDF extraction and text preview

- [ ] M0-P1: Project Initialization (Next.js setup)
- [ ] M0-P2: TypeScript Types Foundation
- [ ] M0-P3: PDF Parser with Web Worker
- [ ] M0-P4: Upload UI Component
- [ ] M0-P5: Plain Text Preview Component
- [ ] M0-P6: Analyze Page Setup
- [ ] M0-P7: Results Page Setup

**Verify:** Can upload PDF and see extracted text within 5 seconds

---

### Milestone 1: MVP Core Features (2-3 weeks)
**Goal:** Complete parse health scoring and findings

- [ ] M1-P1: DOCX Parser Implementation
- [ ] M1-P2: Multi-Column Detection Heuristic
- [ ] M1-P3: Contact Info & Section Detection
- [ ] M1-P4: Parse Health Scoring Engine
- [ ] M1-P5: Findings Panel Component
- [ ] M1-P6: Scores Display Component
- [ ] M1-P7: IndexedDB Session Storage
- [ ] M1-P8: Export Report Generator (JSON + Markdown)
- [ ] M1-P9: Integrate M1 Features into Results Page

**Verify:** Parse Health score is accurate, findings are actionable, export works

---

### Milestone 2: Job Description Analysis (2 weeks)
**Goal:** JD keyword extraction and knockout detection

- [ ] M2-P1: Keyword Extraction Engine
- [ ] M2-P2: Knockout Detector
- [ ] M2-P3: Keyword Coverage Scorer
- [ ] M2-P4: Knockout Risk Scorer
- [ ] M2-P5: JD Input Component
- [ ] M2-P6: Knockout Checklist Component
- [ ] M2-P7: Keyword Coverage Display
- [ ] M2-P8: Integrate JD Features into Results Page

**Verify:** Keywords extracted correctly, knockout detection catches common disqualifiers

---

### Milestone 3: BYOK Mode (2 weeks)
**Goal:** Optional LLM enrichment

📄 **See `claude_code_prompts_m3_m4.md` for detailed prompts**

- [ ] M3-P1: LLM Provider Interface & Types
- [ ] M3-P2: Gemini Provider Implementation
- [ ] M3-P3: BYOK Settings Modal
- [ ] M3-P4: BYOK Consent Flow
- [ ] M3-P5: Semantic Matching Engine
- [ ] M3-P6: Rewrite Suggestions Engine
- [ ] M3-P7: Enriched Results UI

**Verify:** BYOK consent is clear, API calls work, prompt injection defense tested

---

### Milestone 4: Polish & Portfolio Readiness (2 weeks)
**Goal:** Production-ready app

📄 **See `claude_code_prompts_m3_m4.md` for detailed prompts**

- [ ] M4-P1: Landing Page
- [ ] M4-P2: Help/FAQ Page
- [ ] M4-P3: Privacy Policy & Terms of Use
- [ ] M4-P4: Mock Candidate Profile View
- [ ] M4-P5: PDF Report Export
- [ ] M4-P6: Accessibility Audit & Fixes
- [ ] M4-P7: Mobile Responsive Design
- [ ] M4-P8: Performance Optimization
- [ ] M4-P9: Deployment Configuration
- [ ] M4-P10: Documentation & README

**Verify:** Lighthouse score 90+, WCAG AA compliant, mobile works perfectly

---

## 🎯 How to Use This Checklist

1. **Start with M0-P1** and work sequentially
2. **Check off each prompt** as you complete it
3. **Test the output** before moving to the next prompt
4. **Verify milestone goals** before moving to the next milestone
5. **Reference the full build_plan.md** for complete prompt text

## 📁 File Locations

- **Milestones 0-2 prompts:** `build_plan.md`
- **Milestones 3-4 prompts:** `claude_code_prompts_m3_m4.md`
- **This checklist:** `PROMPTS_QUICK_REFERENCE.md`

## 🔍 Quick Navigation

### Need to find a specific prompt?
- **Project setup?** → M0-P1
- **PDF parsing?** → M0-P3
- **DOCX parsing?** → M1-P1
- **Scoring logic?** → M1-P4
- **Keyword extraction?** → M2-P1
- **BYOK/AI features?** → M3 (see supplemental doc)
- **Landing page?** → M4-P1 (see supplemental doc)
- **Deployment?** → M4-P9 (see supplemental doc)

### Need context?
- **What are we building?** → `Project_Overview_v1.1.md`
- **How does it work?** → `Technical_Architecture_Document.md`
- **What are the features?** → `Product_Requirements_Document.md`
- **Privacy/security?** → `Compliance_and_Safeguards_Document.md`
- **User flows?** → `User_Experience_Document.md`

---

## 📊 Progress Tracking

**Current milestone:** M0 ⬜
**Prompts completed:** 0 / 35+
**Estimated completion:** 9-10 weeks

### Milestone Progress Bars
```
M0: Foundation         [░░░░░░░] 0/7
M1: MVP Core           [░░░░░░░░░] 0/9
M2: JD Analysis        [░░░░░░░░] 0/8
M3: BYOK               [░░░░░░░] 0/7
M4: Polish             [░░░░░░░░░░] 0/10
```

Update this as you go!

---

## 🚀 Ready to Start?

**Next step:** Open `build_plan.md` and copy **Milestone 0, Prompt 1** into Claude Code.

Good luck building Jalanea ATS! 🎉
