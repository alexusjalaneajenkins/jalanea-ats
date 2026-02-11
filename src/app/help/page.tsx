'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, Mail, ArrowLeft, Search, HelpCircle, User, CreditCard, Wrench, Shield } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <HelpCircle className="w-5 h-5" />,
    items: [
      {
        question: 'How does Jalanea ATS work?',
        answer: 'Upload your resume and paste a job description. Our AI analyzes how well your resume matches the job requirements, identifies missing keywords, and provides actionable suggestions to improve your match score.',
      },
      {
        question: 'What file formats are supported?',
        answer: 'We support PDF files for resume uploads. Make sure your PDF is text-based (not a scanned image) for the best analysis results.',
      },
      {
        question: 'How accurate is the ATS matching?',
        answer: 'Our AI uses the same keyword extraction and semantic matching techniques used by real Applicant Tracking Systems. While no tool is 100% accurate, our analysis gives you a strong indication of how your resume will perform.',
      },
      {
        question: 'Can I analyze multiple resumes?',
        answer: 'Yes! With a paid subscription, you can analyze unlimited resumes. Free users get a limited number of analyses to try the service.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & Login',
    icon: <User className="w-5 h-5" />,
    items: [
      {
        question: 'How do I create an account?',
        answer: 'Click "Sign up" and enter your email and password, or use "Continue with Google" for faster signup. You\'ll receive a confirmation email to verify your account.',
      },
      {
        question: 'I forgot my password. How do I reset it?',
        answer: 'Currently, password reset is handled through your account settings. If you\'re locked out, contact us at support-ats@jalanea.dev and we\'ll help you regain access.',
      },
      {
        question: 'How do I change my email address?',
        answer: 'Go to your Account page and click "Change email" in the Account Settings section. You\'ll receive a confirmation link at your new email address.',
      },
      {
        question: 'How do I delete my account?',
        answer: 'Go to your Account page and click "Delete account" in the Account Settings section. This will cancel any active subscriptions and permanently delete all your data.',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Subscriptions & Billing',
    icon: <CreditCard className="w-5 h-5" />,
    items: [
      {
        question: 'What subscription plans are available?',
        answer: 'We offer two plans: Monthly ($5/month) for ongoing access, and Lifetime ($15 one-time) for unlimited access forever. Both include unlimited resume analyses and all AI features.',
      },
      {
        question: 'How do I cancel my subscription?',
        answer: 'Go to your Account page and click "Manage billing" to access the Stripe Customer Portal. From there, you can cancel your subscription at any time.',
      },
      {
        question: 'Can I get a refund?',
        answer: 'Monthly subscriptions can be canceled anytime but are non-refundable for the current billing period. For lifetime purchases, contact us within 7 days if you\'re not satisfied.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe.',
      },
      {
        question: 'Is my payment information secure?',
        answer: 'Yes. We never store your card details. All payments are processed securely through Stripe, which is PCI-DSS Level 1 certified.',
      },
    ],
  },
  {
    id: 'technical',
    title: 'Technical Issues',
    icon: <Wrench className="w-5 h-5" />,
    items: [
      {
        question: 'Why is my resume not uploading?',
        answer: 'Make sure your file is a PDF under 10MB. If the upload still fails, try refreshing the page or using a different browser. Contact us if the issue persists.',
      },
      {
        question: 'The analysis is taking too long. What should I do?',
        answer: 'Analysis typically takes 10-30 seconds. If it\'s taking longer, check your internet connection and try refreshing. Our AI servers may occasionally experience high traffic.',
      },
      {
        question: 'I\'m seeing an error message. What does it mean?',
        answer: 'Most errors are temporary. Try refreshing the page and attempting your action again. If you see specific error codes or persistent issues, contact us with the error details.',
      },
      {
        question: 'Which browsers are supported?',
        answer: 'Jalanea ATS works best on modern browsers: Chrome, Firefox, Safari, and Edge. Make sure your browser is up to date for the best experience.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & Data',
    icon: <Shield className="w-5 h-5" />,
    items: [
      {
        question: 'Is my resume data secure?',
        answer: 'Yes. Your resume data is encrypted in transit and at rest. We use industry-standard security practices to protect your information.',
      },
      {
        question: 'Do you share my data with employers or third parties?',
        answer: 'No. We never share, sell, or provide your resume or personal data to employers, recruiters, or any third parties. Your data is yours.',
      },
      {
        question: 'How long do you keep my data?',
        answer: 'We retain your data while your account is active. Analysis results are stored for your reference. When you delete your account, all your data is permanently removed.',
      },
      {
        question: 'How can I request my data or deletion (GDPR)?',
        answer: 'You can delete your account from the Account page, which removes all your data. For data export requests or other privacy inquiries, contact us at support-ats@jalanea.dev.',
      },
    ],
  },
];

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-indigo-500/10 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors pr-4">
          {item.question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-indigo-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-indigo-300 pb-4 leading-relaxed">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const toggleItem = (categoryId: string, index: number) => {
    const key = `${categoryId}-${index}`;
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter FAQs based on search
  const filteredCategories = searchQuery.trim()
    ? faqCategories.map(category => ({
        ...category,
        items: category.items.filter(
          item =>
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(category => category.items.length > 0)
    : faqCategories;

  const displayCategories = activeCategory
    ? filteredCategories.filter(c => c.id === activeCategory)
    : filteredCategories;

  return (
    <div className="min-h-screen px-4 py-8 flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f1a] to-[#1a1333]" />
        <motion.div
          className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.25, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto flex-1 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-pink-500/25 transition-shadow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">
              <span className="text-white">Jalanea</span>
              <span className="text-orange-400"> ATS</span>
            </span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-white mb-1">Help Center</h1>
          <p className="text-sm text-indigo-300">Find answers to common questions</p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search for answers..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1a1a2e]/90 border border-indigo-500/20 text-white placeholder-indigo-400 focus:outline-none focus:border-indigo-400 transition-colors"
            />
          </div>
        </motion.div>

        {/* Category pills */}
        {!searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2 mb-6"
          >
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !activeCategory
                  ? 'bg-indigo-500 text-white'
                  : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
              }`}
            >
              All
            </button>
            {faqCategories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id === activeCategory ? null : category.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-indigo-500 text-white'
                    : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                }`}
              >
                {category.title}
              </button>
            ))}
          </motion.div>
        )}

        {/* FAQ Categories */}
        <div className="space-y-4">
          {displayCategories.map((category, catIndex) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + catIndex * 0.05 }}
              className="bg-[#1a1a2e]/90 border border-indigo-500/10 rounded-2xl p-5 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  {category.icon}
                </div>
                <h2 className="text-sm font-semibold text-white">{category.title}</h2>
              </div>
              <div>
                {category.items.map((item, index) => (
                  <FAQAccordion
                    key={index}
                    item={item}
                    isOpen={openItems[`${category.id}-${index}`] || false}
                    onToggle={() => toggleItem(category.id, index)}
                  />
                ))}
              </div>
            </motion.div>
          ))}

          {displayCategories.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-indigo-300">No results found for &ldquo;{searchQuery}&rdquo;</p>
            </motion.div>
          )}
        </div>

        {/* Contact section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6 text-center"
        >
          <h3 className="text-lg font-semibold text-white mb-2">Still need help?</h3>
          <p className="text-sm text-indigo-300 mb-4">
            Can&apos;t find what you&apos;re looking for? We&apos;re here to help.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </Link>
          <p className="text-xs text-indigo-400 mt-3">support-ats@jalanea.dev</p>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="relative z-10 flex justify-center gap-4 py-4 mt-8 text-xs text-indigo-600"
      >
        <Link href="/" className="hover:text-indigo-400 transition-colors">Home</Link>
        <Link href="/pricing" className="hover:text-indigo-400 transition-colors">Pricing</Link>
        <Link href="/terms" className="hover:text-indigo-400 transition-colors">Terms</Link>
      </motion.div>
    </div>
  );
}
