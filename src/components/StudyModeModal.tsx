import React, { useState } from 'react';
import {
  X,
  GraduationCap,
  Calendar,
  BookOpen,
  FileText,
  HelpCircle,
  CheckSquare,
  Award,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { StudyTool } from '../types';

interface StudyModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string, toolTitle: string) => void;
  uiLanguage: 'hi' | 'en';
}

const STUDY_TOOLS: StudyTool[] = [
  {
    id: 'study-plan',
    titleHi: 'Study Plan (टाइमटेबल)',
    titleEn: 'Study Plan',
    descHi: 'अपने विषय और परीक्षा के अनुसार व्यावहारिक स्टडी टाइमटेबल और रूटीन बनाएं',
    descEn: 'Create a practical study schedule tailored to your exams and subjects',
    icon: 'Calendar',
    placeholderHi: 'उदा. 12वीं बोर्ड परीक्षा के लिए 30 दिन का फिजिक्स और केमिस्ट्री प्लान',
    placeholderEn: 'e.g. 30-day preparation plan for Class 12 Physics & Chemistry',
    buildPrompt: (input) =>
      `कृपया मेरे लिए एक विस्तृत और व्यावहारिक Study Plan (टाइमटेबल) तैयार करें। लक्ष्य/विषय: "${input}". 
कृपया इसमें daily study hours, revision slots, breaks और महत्वपूर्ण topics को प्राथमिकता दें।`,
  },
  {
    id: 'explain-topic',
    titleHi: 'Explain a Topic (आसान भाषा में समझें)',
    titleEn: 'Explain a Topic',
    descHi: 'कठिन से कठिन विषय को आसान उदाहरणों और आसान भाषा में समझें',
    descEn: 'Understand complex concepts with simple real-world Indian examples',
    icon: 'BookOpen',
    placeholderHi: 'उदा. Quantum Physics का बुनियादी नियम / Photosynthesis क्या है',
    placeholderEn: 'e.g. Concept of inflation, or how neural networks work',
    buildPrompt: (input) =>
      `कृपया इस टॉपिक को बिल्कुल सरल भाषा और रोज़मर्रा के उदाहरणों के साथ समझाइए: "${input}". 
इसे ऐसे समझाइए जैसे मैं पहली बार सीख रहा हूँ। मुख्य बिंदु, सूत्र (यदि हों) और एक सारांश भी दें।`,
  },
  {
    id: 'notes-maker',
    titleHi: 'Notes (रिवीजन नोट्स)',
    titleEn: 'Revision Notes',
    descHi: 'किसी भी चैप्टर या टॉपिक के हाई-यील्ड बुलेट नोट्स और समरी पाएं',
    descEn: 'Get high-yield bullet notes and summaries for quick exam revision',
    icon: 'FileText',
    placeholderHi: 'उदा. भारतीय संविधान के मौलिक अधिकार / Newton\'s Laws of Motion',
    placeholderEn: 'e.g. French Revolution causes, or Organic Chemistry reagents',
    buildPrompt: (input) =>
      `कृपया इस विषय के परीक्षा उपयोगी 'रिवीजन नोट्स' (Quick Revision Notes) बुलेट पॉइंट्स में तैयार करें: "${input}". 
महत्वपूर्ण परिभाषाएँ, मुख्य बिंदु और याद रखने योग्य ट्रिक्स (Mnemonics) शामिल करें।`,
  },
  {
    id: 'homework-help',
    titleHi: 'Homework Help (गृहकार्य सहायता)',
    titleEn: 'Homework Help',
    descHi: 'गणित, विज्ञान, कोडिंग या किसी भी सवाल का स्टेप-बाय-स्टेप हल पाएं',
    descEn: 'Get step-by-step solutions and explanations for assignments and questions',
    icon: 'HelpCircle',
    placeholderHi: 'उदा. अपना सवाल यहाँ लिखें या पेस्ट करें...',
    placeholderEn: 'e.g. Paste or describe your homework problem...',
    buildPrompt: (input) =>
      `कृपया इस सवाल को चरणबद्ध (step-by-step) तरीके से हल करें और समझाएं:
"${input}"
हल के प्रत्येक चरण का कारण स्पष्ट करें ताकि मैं इसे आसानी से सीख सकूँ।`,
  },
  {
    id: 'mcq-practice',
    titleHi: 'MCQ Practice (क्विज़ और प्रैक्टिस)',
    titleEn: 'MCQ Practice',
    descHi: 'चार विकल्पों वाले अभ्यास प्रश्न (MCQs) उत्तर और व्याख्या के साथ पाएं',
    descEn: 'Generate multiple-choice questions with answers and detailed explanations',
    icon: 'CheckSquare',
    placeholderHi: 'उदा. UPSC के लिए आधुनिक भारत का इतिहास / Class 10th Biology',
    placeholderEn: 'e.g. Modern Indian History, or Microeconomics MCQs',
    buildPrompt: (input) =>
      `कृपया इस विषय पर 5 महत्वपूर्ण बहुविकल्पीय प्रश्न (MCQs) बनाएं: "${input}". 
प्रत्येक प्रश्न में 4 विकल्प (A, B, C, D) हों, और अंत में सही उत्तर के साथ स्पष्टीकरण (Explanation) भी दें।`,
  },
  {
    id: 'exam-prep',
    titleHi: 'Exam Preparation (परीक्षा तैयारी)',
    titleEn: 'Exam Preparation',
    descHi: 'अक्सर पूछे जाने वाले सवाल, परीक्षा रणनीति और स्कोर बढ़ाने के टिप्स',
    descEn: 'Important questions, scoring strategies, and last-minute tips',
    icon: 'Award',
    placeholderHi: 'उदा. JEE Mains में स्कोर सुधारने के टिप्स / SSC CGL Maths तैयारी',
    placeholderEn: 'e.g. Board exam answer presentation tips',
    buildPrompt: (input) =>
      `कृपया इस परीक्षा/विषय की तैयारी के लिए सबसे महत्वपूर्ण रणनीति बताएं: "${input}". 
इसमें अक्सर पूछे जाने वाले टॉपिक्स, समय प्रबंधन (Time Management), और नंबर बढ़ाने के स्मार्ट टिप्स बताएं।`,
  },
];

export const StudyModeModal: React.FC<StudyModeModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
  uiLanguage,
}) => {
  const [selectedTool, setSelectedTool] = useState<StudyTool | null>(null);
  const [customInput, setCustomInput] = useState('');

  const handleToolClick = (tool: StudyTool) => {
    setSelectedTool(tool);
    setCustomInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool) return;
    const finalInput = customInput.trim() || 'सामान्य परीक्षा तैयारी';
    const prompt = selectedTool.buildPrompt(finalInput);
    onSelectPrompt(prompt, selectedTool.titleHi);
    setSelectedTool(null);
    onClose();
  };

  const getToolIcon = (iconName: string) => {
    switch (iconName) {
      case 'Calendar':
        return <Calendar className="h-5 w-5 text-amber-400" />;
      case 'BookOpen':
        return <BookOpen className="h-5 w-5 text-amber-400" />;
      case 'FileText':
        return <FileText className="h-5 w-5 text-amber-400" />;
      case 'HelpCircle':
        return <HelpCircle className="h-5 w-5 text-amber-400" />;
      case 'CheckSquare':
        return <CheckSquare className="h-5 w-5 text-amber-400" />;
      case 'Award':
        return <Award className="h-5 w-5 text-amber-400" />;
      default:
        return <GraduationCap className="h-5 w-5 text-amber-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-3xl sm:rounded-3xl border border-amber-500/30 bg-[#090d18] text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-950/20 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-300">Study Mode (पढ़ाई मोड)</h2>
              <p className="text-xs text-slate-400">अपनी पढ़ाई के लिए सही टूल चुनें</p>
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
              {STUDY_TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool)}
                  className="group flex flex-col items-start rounded-2xl border border-slate-800/90 bg-[#0c1222] p-4 text-left hover:border-amber-500/40 hover:bg-[#10172c] hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all active:scale-98"
                >
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                    {getToolIcon(tool.icon)}
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-300">
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
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 mb-1"
              >
                ← वापस सभी टूल्स पर जाएं
              </button>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                <div className="flex items-center gap-2 mb-1">
                  {getToolIcon(selectedTool.icon)}
                  <h3 className="text-base font-bold text-amber-300">{selectedTool.titleHi}</h3>
                </div>
                <p className="text-xs text-slate-300">{selectedTool.descHi}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  विषय / टॉपिक / प्रश्न दर्ज करें:
                </label>
                <textarea
                  rows={3}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder={selectedTool.placeholderHi}
                  autoFocus
                  className="w-full rounded-xl border border-slate-700 bg-[#0c1222] p-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
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
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-xs font-bold text-black hover:brightness-110 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
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
