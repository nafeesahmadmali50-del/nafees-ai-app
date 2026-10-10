import React, { useState } from 'react';
import {
  X,
  Briefcase,
  Lightbulb,
  FileSpreadsheet,
  Megaphone,
  Tag,
  Share2,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { BusinessTool } from '../types';

interface BusinessModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string, toolTitle: string) => void;
  uiLanguage: 'hi' | 'en';
}

const BUSINESS_TOOLS: BusinessTool[] = [
  {
    id: 'biz-ideas',
    titleHi: 'Business Ideas (बिजनेस आइडियाज)',
    titleEn: 'Business Ideas',
    descHi: 'कम बजट, उच्च मुनाफ़े और आज के ट्रेंड के अनुसार नए बिजनेस विचार',
    descEn: 'Profitable, low-budget and trending business ideas tailored to your budget',
    icon: 'Lightbulb',
    placeholderHi: 'उदा. ₹50,000 के बजट में छोटे शहर या गाँव के लिए बिजनेस आइडिया',
    placeholderEn: 'e.g. Low investment online or retail business in India',
    buildPrompt: (input) =>
      `कृपया मुझे निम्नलिखित बजट और रुचि के अनुसार 3-5 लाभदायक और व्यावहारिक Business Ideas सुझाइए: "${input}". 
प्रत्येक आइडिया के लिए:
1. निवेश की आवश्यकता (Investment in ₹ INR)
2. संभावित लाभ (Expected Profit & Margin)
3. लक्षित ग्राहक (Target Audience)
4. शुरू करने के पहले 3 महत्वपूर्ण कदम बताएं।`,
  },
  {
    id: 'biz-plan',
    titleHi: 'Business Plan (कम्प्लीट बिजनेस प्लान)',
    titleEn: 'Business Plan',
    descHi: 'मार्केट रिसर्च, यूएसपी, रेवेन्यू मॉडल और ऑपरेशनल रोडमैप',
    descEn: 'End-to-end business plan covering market analysis, USP, and financials',
    icon: 'FileSpreadsheet',
    placeholderHi: 'उदा. एक क्लाउड किचन या ऑर्गेनिक स्पाइस ब्रांड का बिजनेस प्लान',
    placeholderEn: 'e.g. Complete business plan for a direct-to-consumer apparel brand',
    buildPrompt: (input) =>
      `कृपया मेरे इस व्यवसाय के लिए एक सुव्यवस्थित और संपूर्ण Business Plan तैयार करें: "${input}". 
प्लान में ये भाग शामिल करें:
- Executive Summary & USP (Unique Selling Proposition)
- Target Market & Competitor Analysis
- Operations & Supply Chain
- Revenue Streams & Pricing
- Risk Factors & Solutions`,
  },
  {
    id: 'marketing-plan',
    titleHi: 'Marketing Plan (मार्केटिंग रणनीति)',
    titleEn: 'Marketing Plan',
    descHi: 'कस्टमर लाने के लिए डिजिटल, लोकल और सोशल मीडिया मार्केटिंग स्ट्रैटेजी',
    descEn: 'Customer acquisition strategy combining social media, local and digital ads',
    icon: 'Megaphone',
    placeholderHi: 'उदा. जिम, रेस्टोरेंट, ई-कॉमर्स स्टोर या रियल एस्टेट के लिए मार्केटिंग',
    placeholderEn: 'e.g. 0-to-1 marketing plan to get first 100 paying customers',
    buildPrompt: (input) =>
      `कृपया इस बिजनेस के लिए सबसे प्रभावी और कम खर्चीला Marketing Plan बताएं: "${input}". 
इसमें ऑर्गेनिक रीच (Instagram, WhatsApp, Google My Business), वर्ड-ऑफ-माउथ ट्रिक्स, और भुगतान वाले विज्ञापनों (Meta/Google Ads) की रणनीति बताएं।`,
  },
  {
    id: 'product-desc',
    titleHi: 'Product Description (प्रोडक्ट विवरण)',
    titleEn: 'Product Description',
    descHi: 'कन्वर्जन और सेल बढ़ाने वाले सम्मोहक प्रोडक्ट टाइटल्स और डिस्क्रिप्शन',
    descEn: 'High-converting product descriptions, bullet points and sales copy',
    icon: 'Tag',
    placeholderHi: 'उदा. हस्तनिर्मित लेदर वॉलेट / हर्बल शैम्पू / कोचिंग कोर्स',
    placeholderEn: 'e.g. Handmade leather wallet or organic skincare cream',
    buildPrompt: (input) =>
      `कृपया इस प्रोडक्ट के लिए बिक्री बढ़ाने वाला आकर्षक Product Description लिखें: "${input}". 
इसमें:
- कैची हेडलाइन (Catchy Hook)
- मुख्य लाभ और विशेषताएं (Features vs Benefits)
- ग्राहकों की समस्या का समाधान
- कॉल टू एक्शन (Call to Action - Buy Now)`,
  },
  {
    id: 'social-media',
    titleHi: 'Social Media Content (कंटेंट रणनीति)',
    titleEn: 'Social Media Content',
    descHi: 'इंस्टाग्राम रील्स, व्हाट्सएप ब्रॉडकास्ट, लिंक्डइन और यूट्यूब के लिए पोस्ट स्क्रिप्ट',
    descEn: 'Engaging Instagram reels hooks, WhatsApp messages and posts',
    icon: 'Share2',
    placeholderHi: 'उदा. मेरे कपड़ों के ब्रांड के लिए 7 दिन का इंस्टाग्राम रील कंटेंट कैलेंडर',
    placeholderEn: 'e.g. 1-week reel scripts and hooks for fitness coaching',
    buildPrompt: (input) =>
      `कृपया इस बिजनेस के लिए वायरल होने योग्य Social Media Content Ideas और स्क्रिप्ट तैयार करें: "${input}". 
प्रत्येक पोस्ट में अटेंशन-ग्रैबिंग हुक (Hook), मुख्य बॉडी (Value) और आकर्षक कैप्शन के साथ हैशटैग्स दें।`,
  },
  {
    id: 'profit-expense',
    titleHi: 'Profit and Expense Help (मुनाफा और लागत)',
    titleEn: 'Profit & Expense Help',
    descHi: 'लागत, ब्रेक-ईवेन पॉइंट, ग्रॉस मार्जिन और खर्च घटाने के सुझाव',
    descEn: 'Cost breakdown, pricing strategy, break-even point and profit margin help',
    icon: 'TrendingUp',
    placeholderHi: 'उदा. अगर किसी प्रोडक्ट को बनाने में ₹200 लगते हैं, तो प्राइसिंग और मार्जिन क्या रखें',
    placeholderEn: 'e.g. Help me calculate gross margin and pricing for food business',
    buildPrompt: (input) =>
      `कृपया मुझे इस बिजनेस के लागत, मुनाफा और मूल्य निर्धारण (Pricing & Profit Calculation) में मदद करें:
"${input}". 
कृपया फिक्स्ड और वेरिएबल लागत, न्यूनतम बिक्री (Break-Even Point), और स्वस्थ प्रॉफिट मार्जिन बनाए रखने के उपाय स्पष्ट रूप से गणितीय गणना के साथ समझाइए।`,
  },
];

export const BusinessModeModal: React.FC<BusinessModeModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
  uiLanguage,
}) => {
  const [selectedTool, setSelectedTool] = useState<BusinessTool | null>(null);
  const [customInput, setCustomInput] = useState('');

  const handleToolClick = (tool: BusinessTool) => {
    setSelectedTool(tool);
    setCustomInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool) return;
    const finalInput = customInput.trim() || 'नया बिजनेस विचार';
    const prompt = selectedTool.buildPrompt(finalInput);
    onSelectPrompt(prompt, selectedTool.titleHi);
    setSelectedTool(null);
    onClose();
  };

  const getToolIcon = (iconName: string) => {
    switch (iconName) {
      case 'Lightbulb':
        return <Lightbulb className="h-5 w-5 text-emerald-400" />;
      case 'FileSpreadsheet':
        return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
      case 'Megaphone':
        return <Megaphone className="h-5 w-5 text-emerald-400" />;
      case 'Tag':
        return <Tag className="h-5 w-5 text-emerald-400" />;
      case 'Share2':
        return <Share2 className="h-5 w-5 text-emerald-400" />;
      case 'TrendingUp':
        return <TrendingUp className="h-5 w-5 text-emerald-400" />;
      default:
        return <Briefcase className="h-5 w-5 text-emerald-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-3xl sm:rounded-3xl border border-emerald-500/30 bg-[#07111b] text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-950/20 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-emerald-300">Business Mode (बिजनेस मोड)</h2>
              <p className="text-xs text-slate-400">व्यवसाय शुरू करने और बढ़ाने के स्मार्ट टूल्स</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedTool(null);
              onClose();
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {!selectedTool ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BUSINESS_TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool)}
                  className="group flex flex-col items-start rounded-2xl border border-slate-800/90 bg-[#0a1622] p-4 text-left hover:border-emerald-500/40 hover:bg-[#0d1e2e] hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all active:scale-98"
                >
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                    {getToolIcon(tool.icon)}
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-emerald-300">
                    {tool.titleHi}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {tool.descHi}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            // Tool Detail & Prompt Form
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedTool(null)}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 mb-1"
              >
                ← वापस सभी टूल्स पर जाएं
              </button>

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                <div className="flex items-center gap-2 mb-1">
                  {getToolIcon(selectedTool.icon)}
                  <h3 className="text-base font-bold text-emerald-300">{selectedTool.titleHi}</h3>
                </div>
                <p className="text-xs text-slate-300">{selectedTool.descHi}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  बिजनेस / प्रोडक्ट / बजट विवरण दर्ज करें:
                </label>
                <textarea
                  rows={3}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder={selectedTool.placeholderHi}
                  autoFocus
                  className="w-full rounded-xl border border-slate-700 bg-[#091522] p-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTool(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-black hover:brightness-110 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                >
                  <span>NAFEES AI से पूछें</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
