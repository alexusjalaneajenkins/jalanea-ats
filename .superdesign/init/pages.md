# Key Page Dependency Trees

## / (Home Page)
Entry: `src/app/page.tsx`
Dependencies:
- `src/app/page.tsx`
  - `src/hooks/useAuth.ts`
    - `src/lib/supabase-browser.ts`
  - `src/components/UploadDropzone.tsx`
  - `src/components/OnboardingModal.tsx`
  - `src/components/ContinuePrompt.tsx`
  - `src/hooks/useProgress.ts`
  - `src/lib/parsers/pdf.ts`
    - `src/lib/types/session.ts`
      - `src/lib/types/targeting.ts`
    - `src/lib/parsers/types.ts`
  - `src/lib/parsers/docx.ts`
    - `src/lib/types/session.ts`
      - `src/lib/types/targeting.ts`
    - `src/lib/parsers/types.ts`
  - `src/lib/parsers/txt.ts`
    - `src/lib/types/session.ts`
      - `src/lib/types/targeting.ts`
  - `src/lib/types/session.ts`
    - `src/lib/types/targeting.ts`
  - `src/lib/storage/sessionStore.ts`
    - `src/lib/types/session.ts`
      - `src/lib/types/targeting.ts`
  - `src/hooks/useLlmConfig.ts`
    - `src/lib/llm/index.ts`
    - `src/lib/llm/gemini.ts`
      - `src/lib/llm/types.ts`
  - `src/hooks/useFreeTier.ts`
    - `src/lib/llm/types.ts`
  - `src/components/ByokKeyModal.tsx`
    - `src/lib/llm/types.ts`
    - `src/lib/llm/gemini.ts`
      - `src/lib/llm/types.ts`
  - `src/components/ConsentModal.tsx`
    - `src/lib/llm/types.ts`

## /login
Entry: `src/app/(auth)/login/page.tsx`
Dependencies:
- `src/app/(auth)/login/page.tsx`
  - `src/hooks/useAuth.ts`
    - `src/lib/supabase-browser.ts`

## /signup
Entry: `src/app/(auth)/signup/page.tsx`
Dependencies:
- `src/app/(auth)/signup/page.tsx`
  - `src/hooks/useAuth.ts`
    - `src/lib/supabase-browser.ts`

## /pricing
Entry: `src/app/pricing/page.tsx`
Dependencies:
- `src/app/pricing/page.tsx`
  - `src/hooks/useAuth.ts`
    - `src/lib/supabase-browser.ts`
  - `src/lib/stripe-client.ts`

## /account
Entry: `src/app/account/page.tsx`
Dependencies:
- `src/app/account/page.tsx`
  - `src/hooks/useAuth.ts`
    - `src/lib/supabase-browser.ts`
  - `src/lib/supabase-browser.ts`

## /analyze
Entry: `src/app/analyze/page.tsx`
Dependencies:
- `src/app/analyze/page.tsx`

## /results/[sessionId]
Entry: `src/app/results/[sessionId]/page.tsx`
Dependencies:
- `src/app/results/[sessionId]/page.tsx`
  - `src/components/PlainTextPreview.tsx`
  - `src/components/scores/index.ts`
  - `src/components/FindingsPanel.tsx`
    - `src/lib/analysis/findings.ts`
  - `src/components/JobDescriptionInput.tsx`
    - `src/lib/ats/index.ts`
    - `src/hooks/useFreeTier.ts`
      - `src/lib/llm/types.ts`
  - `src/components/JobMatchStepper.tsx`
    - `src/lib/analysis/index.ts`
    - `src/lib/export/report.ts`
      - `src/lib/types/session.ts`
        - `src/lib/types/targeting.ts`
      - `src/lib/types/targeting.ts`
      - `src/lib/types/session.ts`
        - `src/lib/types/targeting.ts`
      - `src/lib/analysis/findings.ts`
    - `src/lib/llm/types.ts`
    - `src/lib/targeting/workflow.ts`
      - `src/lib/analysis/index.ts`
      - `src/lib/types/targeting.ts`
    - `src/lib/types/targeting.ts`
    - `src/lib/types/session.ts`
      - `src/lib/types/targeting.ts`
    - `src/hooks/useFreeTier.ts`
      - `src/lib/llm/types.ts`
    - `src/components/AiFeaturesPanel.tsx`
      - `src/lib/llm/types.ts`
      - `src/lib/llm/semanticMatcher.ts`
        - `src/lib/llm/types.ts`
        - `src/lib/llm/gemini.ts`
          - `src/lib/llm/types.ts`
    - `src/components/JobMatchSummary.tsx`
      - `src/lib/analysis/index.ts`
    - `src/components/KeywordCoveragePanel.tsx`
      - `src/lib/analysis/index.ts`
      - `src/components/ui/KeywordChip.tsx`
    - `src/components/KnockoutChecklist.tsx`
      - `src/lib/types/session.ts`
        - `src/lib/types/targeting.ts`
      - `src/lib/analysis/knockouts.ts`
        - `src/lib/types/session.ts`
          - `src/lib/types/targeting.ts`
      - `src/lib/analysis/knockoutRisk.ts`
        - `src/lib/types/session.ts`
          - `src/lib/types/targeting.ts`
        - `src/lib/analysis/findings.ts`
      - `src/lib/analysis/knockoutAnalysis.ts`
        - `src/lib/types/session.ts`
          - `src/lib/types/targeting.ts`
        - `src/lib/analysis/knockouts.ts`
          - `src/lib/types/session.ts`
            - `src/lib/types/targeting.ts`
    - `src/components/RecruiterSearchPanel.tsx`
      - `src/lib/analysis/index.ts`
    - `src/components/ResumeImprover.tsx`
      - `src/components/BulletSuggestionPopover.tsx`
      - `src/lib/llm/types.ts`
    - `src/components/SemanticMatchPanel.tsx`
      - `src/lib/analysis/index.ts`
  - `src/components/ByokKeyModal.tsx`
    - `src/lib/llm/types.ts`
    - `src/lib/llm/gemini.ts`
      - `src/lib/llm/types.ts`
  - `src/components/ConsentModal.tsx`
    - `src/lib/llm/types.ts`
  - `src/components/ExportButtons.tsx`
    - `src/lib/export/report.ts`
      - `src/lib/types/session.ts`
        - `src/lib/types/targeting.ts`
      - `src/lib/types/targeting.ts`
      - `src/lib/types/session.ts`
        - `src/lib/types/targeting.ts`
      - `src/lib/analysis/findings.ts`
  - `src/components/education/index.ts`
  - `src/components/ats/index.ts`
  - `src/lib/export/report.ts`
    - `src/lib/types/session.ts`
      - `src/lib/types/targeting.ts`
    - `src/lib/types/targeting.ts`
    - `src/lib/types/session.ts`
      - `src/lib/types/targeting.ts`
    - `src/lib/analysis/findings.ts`
  - `src/lib/ats/index.ts`
  - `src/lib/storage/historyStore.ts`
    - `src/lib/types/history.ts`
      - `src/lib/ats/index.ts`
    - `src/lib/types/session.ts`
      - `src/lib/types/targeting.ts`
    - `src/lib/ats/index.ts`
  - `src/lib/types/history.ts`
    - `src/lib/ats/index.ts`
  - `src/components/history/index.ts`
  - `src/lib/types/session.ts`
    - `src/lib/types/targeting.ts`
  - `src/lib/types/targeting.ts`
  - `src/lib/storage/sessionStore.ts`
    - `src/lib/types/session.ts`
      - `src/lib/types/targeting.ts`
  - `src/lib/analysis/index.ts`
  - `src/hooks/useLlmConfig.ts`
    - `src/lib/llm/index.ts`
    - `src/lib/llm/gemini.ts`
      - `src/lib/llm/types.ts`
  - `src/hooks/useProgress.ts`
  - `src/hooks/useFreeTier.ts`
    - `src/lib/llm/types.ts`
  - `src/hooks/useAuth.ts`
    - `src/lib/supabase-browser.ts`
  - `src/lib/llm/types.ts`

## /help
Entry: `src/app/help/page.tsx`
Dependencies:
- `src/app/help/page.tsx`

## Global UI Context Needed for Auth Design Work
When designing auth pages in this repo, also include:
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/components/PWAInstall.tsx`
- `src/hooks/useAuth.ts`
- `src/lib/supabase-browser.ts`
