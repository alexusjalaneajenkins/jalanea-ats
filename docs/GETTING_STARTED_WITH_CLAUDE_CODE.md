# Getting Started with Claude Code - Jalanea ATS
**A step-by-step guide for building this project with Claude Code (Opus model)**

---

## 🎯 Overview

You're about to build **Jalanea ATS**, a privacy-first resume parser and ATS simulator, using Claude Code with the Opus model. This guide will help you get started quickly and work efficiently.

---

## 📚 What You Have

### Documentation (in `/docs`)
1. **`build_plan.md`** - Complete build plan with embedded prompts (M0-M2)
2. **`claude_code_prompts_m3_m4.md`** - Supplemental prompts for M3-M4
3. **`PROMPTS_QUICK_REFERENCE.md`** - Checklist of all prompts
4. **`Project_Overview_v1.1.md`** - Product vision and principles
5. **`Technical_Architecture_Document.md`** - System design
6. **`Product_Requirements_Document.md`** - Feature specs
7. **`Compliance_and_Safeguards_Document.md`** - Security requirements
8. **`User_Experience_Document.md`** - UX flows

### What Makes This Special
- **Copy-paste ready prompts** for every feature
- **Sequential organization** - each prompt builds on the previous
- **Complete context** - prompts reference the architecture docs
- **Testing criteria** - know when each milestone is complete

---

## 🚀 Quick Start (First 30 Minutes)

### Step 1: Open Your Terminal
```bash
cd /Users/alexusjenkins/Documents/Jalanea\ Forge\ -\ AI\ Product\ Designer/jalanea-ats
```

### Step 2: Launch Claude Code
Open your Claude Code CLI/interface and navigate to the project directory.

### Step 3: Copy Your First Prompt
Open `docs/build_plan.md` and find **Milestone 0, Prompt 1: Project Initialization**

Copy this entire prompt:
```
Initialize a new Next.js project with the App Router and TypeScript for the Jalanea ATS project.

Requirements:
1. Use create-next-app with TypeScript and App Router
2. Configure the project in the current directory (/mnt/jalanea-ats)
3. Install these dependencies: pdfjs-dist, mammoth, uuid
...
```

### Step 4: Paste into Claude Code
Paste the prompt into Claude Code and let it execute.

### Step 5: Review the Output
- Check that Next.js initialized correctly
- Verify dependencies installed
- Review folder structure

### Step 6: Test It
```bash
npm run dev
```
Visit http://localhost:3000 to confirm it works.

### Step 7: Move to Next Prompt
Open `docs/PROMPTS_QUICK_REFERENCE.md` and check off M0-P1 ✓

Repeat this process for M0-P2, M0-P3, etc.

---

## 💡 Best Practices

### 1. Work Sequentially
- Don't skip prompts - each builds on previous work
- Complete one milestone before starting the next
- Test after each prompt

### 2. Use the Context Documents
When Claude Code needs more context, point it to:
- "Review the Technical_Architecture_Document.md section 5.2 for column detection details"
- "See the Compliance_and_Safeguards_Document.md for security requirements"

### 3. Verify Output Quality
After each prompt, check:
- Does the code compile? (no TypeScript errors)
- Does it match the requirements in the prompt?
- Does it follow the architecture in the docs?

### 4. Keep Track of Progress
Update `PROMPTS_QUICK_REFERENCE.md` with checkmarks as you go.

### 5. Test Incrementally
Don't wait until the end to test. After each milestone:
- Run the dev server
- Upload a test resume
- Check that features work
- Fix issues before moving on

---

## 🔧 Recommended Workflow

### Daily Session (2-3 hours)
1. **Review** - Read through next 2-3 prompts to understand what you'll build
2. **Execute** - Paste prompts into Claude Code one at a time
3. **Test** - Run the app after each prompt to verify
4. **Commit** - Git commit after each working feature
5. **Update** - Check off completed prompts in the quick reference

### Weekly Goals
- **Week 1:** Complete M0 (Foundation)
- **Week 2-3:** Complete M1 (Core Features)
- **Week 4-5:** Complete M2 (JD Analysis)
- **Week 6-7:** Complete M3 (BYOK) - optional if timeline tight
- **Week 8-9:** Complete M4 (Polish)
- **Week 10:** Buffer for testing and fixes

---

## 🎨 Customization Tips

### While Following Prompts
The prompts are comprehensive, but you can customize:

1. **UI/Styling** - Use your preferred color scheme
2. **Component library** - Prompts suggest Tailwind, but you can use others
3. **Icons** - Choose your preferred icon library
4. **Animations** - Add your own flair

### After Core Features Work
Once M1 is complete and working, you can:
- Refine the design
- Add branding elements
- Improve animations
- Optimize performance

---

## 🐛 Troubleshooting

### If a Prompt Doesn't Work
1. **Check dependencies** - Run `npm install` to ensure packages are installed
2. **Review previous prompts** - Did you skip something?
3. **Check file paths** - Verify files are in the right locations
4. **Read the error** - TypeScript errors usually point to the issue
5. **Reference the docs** - Check the Technical Architecture Document

### If You Get Stuck
1. **Re-read the prompt** - Make sure you understand what it's asking
2. **Check the architecture doc** - See the design rationale
3. **Look at the types** - TypeScript types often clarify requirements
4. **Start fresh** - Sometimes it's easier to redo a prompt than debug

### Common Issues

**"Module not found"**
- Run `npm install [package-name]`
- Check import paths

**"Property does not exist on type"**
- Review the TypeScript types (M0-P2)
- Check if you created all required fields

**"PDF.js worker not loading"**
- Verify worker file is in `/public`
- Check worker path in configuration

**"IndexedDB quota exceeded"**
- Implement the cleanup function (M1-P7)
- Clear browser storage for testing

---

## 📦 What You'll Build

### After M0 (Week 1)
- Working Next.js app
- Can upload PDFs
- See extracted text
- Basic routing works

### After M1 (Week 3-4)
- DOCX support added
- Parse Health scoring works
- Findings panel shows issues
- Can export reports
- Local history saves sessions

### After M2 (Week 5-6)
- Paste job descriptions
- Get keyword coverage score
- See knockout requirements
- Confirm eligibility
- Get keyword suggestions

### After M3 (Week 7-8) - Optional
- BYOK mode available
- Semantic matching works
- Get AI-powered rewrites
- All with user consent

### After M4 (Week 9-10)
- Professional landing page
- Complete documentation
- Mobile responsive
- Deployed to production
- Portfolio-ready!

---

## 🎓 Learning Opportunities

As you work through this project, you'll gain experience with:
- **Next.js App Router** - Modern React framework
- **TypeScript** - Type-safe development
- **Web Workers** - Background processing
- **IndexedDB** - Client-side storage
- **PDF.js** - Document parsing
- **NLP techniques** - Keyword extraction
- **LLM integration** - AI provider APIs
- **Accessibility** - WCAG compliance
- **Performance** - Optimization techniques
- **Deployment** - Production hosting

---

## 📈 Success Metrics

### Technical Goals
- ✓ Parse Health accuracy > 90%
- ✓ Keyword extraction precision > 80%
- ✓ App loads in < 2 seconds
- ✓ Lighthouse score > 90
- ✓ Zero exfiltration verified
- ✓ WCAG AA compliant

### Portfolio Goals
- ✓ Demonstrates full-stack capability
- ✓ Shows privacy-first design
- ✓ Complex document processing
- ✓ AI integration (optional)
- ✓ Production-ready quality

---

## 🎉 Final Checklist

Before considering the project "done":
- [ ] All M0-M4 prompts completed
- [ ] App deployed to production
- [ ] README.md complete with setup instructions
- [ ] Privacy policy and terms published
- [ ] Manual testing on multiple browsers
- [ ] Mobile testing on real devices
- [ ] Lighthouse audit passes
- [ ] Accessibility audit passes
- [ ] No console errors in production
- [ ] Demo video recorded
- [ ] Portfolio case study written

---

## 🚀 You're Ready!

**Your next action:**
1. Open `docs/build_plan.md`
2. Scroll to **Milestone 0, Prompt 1**
3. Copy the prompt
4. Paste into Claude Code
5. Watch the magic happen! ✨

Good luck building Jalanea ATS! This is going to be an awesome portfolio piece.

---

**Questions or need help?** Reference the docs or reach out to the Claude Code community.

**Encountered an issue?** Document it in a NOTES.md file for your case study - showing how you solved problems is valuable!
