# Jalanea ATS Documentation Index
**Complete project documentation for building with Claude Code**

---

## 📋 Document Overview

This folder contains all the documentation needed to build Jalanea ATS from scratch using Claude Code (Opus model). Documents are organized by purpose.

---

## 🎯 Start Here

### For Building the Project
1. **`GETTING_STARTED_WITH_CLAUDE_CODE.md`** ⭐ **START HERE**
   - Step-by-step guide for building with Claude Code
   - Best practices and workflow recommendations
   - Troubleshooting tips
   - **Read this first before starting development**

2. **`PROMPTS_QUICK_REFERENCE.md`** 📋
   - Checklist of all 35+ Claude Code prompts
   - Progress tracking
   - Quick navigation to specific prompts
   - **Use this to track your progress**

3. **`build_plan.md`** 📘 **MAIN BUILD DOCUMENT**
   - Complete build plan with timeline (9-10 weeks)
   - Embedded prompts for Milestones 0-2
   - Technical specifications
   - Testing strategies
   - **Reference this throughout development**

4. **`claude_code_prompts_m3_m4.md`** 📗
   - Supplemental prompts for Milestones 3-4
   - BYOK mode implementation
   - Polish and deployment
   - **Use after completing M0-M2**

---

## 📚 Project Documentation (Reference Materials)

### Product & Strategy
5. **`Project_Overview_v1.1.md`** 🎯
   - Elevator pitch and problem statement
   - Product principles and positioning
   - Core features and modes (On-Device vs BYOK)
   - Target users and success metrics
   - **Read for product context**

6. **`Product_Requirements_Document.md`** 📊
   - Functional requirements
   - User stories (must-have, should-have, could-have)
   - Non-functional requirements
   - Success metrics
   - **Reference for feature specifications**

### Technical Design
7. **`Technical_Architecture_Document.md`** 🏗️
   - System architecture and tech stack
   - Data model and TypeScript types
   - Parsing algorithms (PDF, DOCX)
   - Scoring engine specifications
   - Security and privacy implementation
   - **Reference for implementation details**

### User Experience
8. **`User_Experience_Document.md`** 🎨
   - User personas and jobs-to-be-done
   - User flows (upload, analyze, export)
   - UX principles and information architecture
   - Microcopy tone and edge cases
   - **Reference for UX decisions**

### Security & Compliance
9. **`Compliance_and_Safeguards_Document.md`** 🔒
   - Privacy-by-default policy
   - Data inventory and classification
   - Security requirements and threat model
   - Bias and fairness safeguards
   - Legal compliance (GDPR, CCPA, NYC Local Law 144)
   - **Reference for security implementation**

---

## 📖 How to Use These Documents

### If You're Just Starting
```
1. Read: GETTING_STARTED_WITH_CLAUDE_CODE.md
2. Review: Project_Overview_v1.1.md (understand what you're building)
3. Open: build_plan.md → Milestone 0, Prompt 1
4. Start building!
```

### If You're Actively Building
```
1. Keep open: PROMPTS_QUICK_REFERENCE.md (track progress)
2. Reference: build_plan.md (copy prompts)
3. Context: Technical_Architecture_Document.md (when stuck)
4. Check off prompts as you complete them
```

### If You Need Context
```
- "What are we building?" → Project_Overview_v1.1.md
- "How should this work?" → Technical_Architecture_Document.md
- "What features are required?" → Product_Requirements_Document.md
- "How should the UX feel?" → User_Experience_Document.md
- "What security is needed?" → Compliance_and_Safeguards_Document.md
```

### If You're Implementing a Feature
```
1. Find the prompt in build_plan.md or claude_code_prompts_m3_m4.md
2. Review relevant sections in Technical_Architecture_Document.md
3. Copy the prompt into Claude Code
4. Test the output
5. Check off in PROMPTS_QUICK_REFERENCE.md
```

---

## 🗂️ Document Organization

### Build Documents (Use During Development)
- `GETTING_STARTED_WITH_CLAUDE_CODE.md` - Getting started guide
- `PROMPTS_QUICK_REFERENCE.md` - Progress tracker
- `build_plan.md` - Main build document (M0-M2 prompts)
- `claude_code_prompts_m3_m4.md` - Supplemental prompts (M3-M4)

### Reference Documents (Consult as Needed)
- `Project_Overview_v1.1.md` - Product vision
- `Product_Requirements_Document.md` - Feature specs
- `Technical_Architecture_Document.md` - System design
- `User_Experience_Document.md` - UX guidelines
- `Compliance_and_Safeguards_Document.md` - Security requirements

---

## 🎯 Quick Links

### Common Questions

**"Where do I start?"**
→ `GETTING_STARTED_WITH_CLAUDE_CODE.md`

**"What's the next prompt?"**
→ `PROMPTS_QUICK_REFERENCE.md`

**"How does PDF parsing work?"**
→ `Technical_Architecture_Document.md` Section 5

**"What should the scoring algorithm be?"**
→ `Technical_Architecture_Document.md` Section 7

**"How do I handle BYOK consent?"**
→ `Compliance_and_Safeguards_Document.md` Section 5.2

**"What's the UX flow for JD analysis?"**
→ `User_Experience_Document.md` Section 6.2

**"Where are the M3 prompts?"**
→ `claude_code_prompts_m3_m4.md`

---

## 📊 Document Statistics

- **Total Documents:** 9 markdown files
- **Total Size:** ~135 KB
- **Total Prompts:** 35+ (across M0-M4)
- **Estimated Reading Time:** 2-3 hours (all docs)
- **Build Timeline:** 9-10 weeks (following prompts)

---

## 🔄 Document Updates

All documents are version-controlled. Check the "Document Version History" section in each file for changes.

**Latest updates:**
- **2026-01-14:** Added Claude Code prompts to build_plan.md (v2.0)
- **2026-01-14:** Created M3-M4 supplemental prompts
- **2026-01-14:** Created getting started guide and quick reference

---

## ✅ Pre-Build Checklist

Before starting development, ensure you have:
- [ ] Read `GETTING_STARTED_WITH_CLAUDE_CODE.md`
- [ ] Reviewed `Project_Overview_v1.1.md` (understand the product)
- [ ] Located `build_plan.md` (main build document)
- [ ] Opened `PROMPTS_QUICK_REFERENCE.md` (progress tracker)
- [ ] Set up development environment (Node.js, code editor)
- [ ] Ready to use Claude Code (Opus model recommended)

---

## 🚀 You're Ready to Build!

**Next step:** Open `GETTING_STARTED_WITH_CLAUDE_CODE.md` and follow the Quick Start guide.

Good luck! You're about to build something awesome. 🎉

---

## 📞 Need Help?

If you get stuck:
1. Check the troubleshooting section in `GETTING_STARTED_WITH_CLAUDE_CODE.md`
2. Review the relevant technical document
3. Re-read the prompt carefully
4. Search the docs for keywords related to your issue

**Remember:** These documents contain everything you need to build the project. The prompts are comprehensive and reference the architecture docs.

---

**Last updated:** January 14, 2026
**Project:** Jalanea ATS v1.0
**Status:** Ready for Development ✅
