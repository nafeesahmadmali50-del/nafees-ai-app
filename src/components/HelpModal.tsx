import React from 'react';
import {
  X,
  HelpCircle,
  GraduationCap,
  Briefcase,
  Mic,
  Smartphone,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiLanguage: 'hi' | 'en';
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, uiLanguage }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-3xl sm:rounded-3xl border border-blue-500/25 bg-[#070b16] text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-cyan-300">Help & Support (सहायता)</h2>
              <p className="text-xs text-slate-400">NAFEES AI का अधिकतम उपयोग कैसे करें</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Section 1: Introduction */}
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4">
            <div className="flex items-center gap-2 mb-1.5 text-cyan-300 font-bold text-sm">
              <Sparkles className="h-4 w-4" />
              <span>NAFEES AI क्या है?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              NAFEES AI एक सुपरफास्ट, भारतीय परिवेश के अनुकूल मोबाइल-फ़र्स्ट AI असिस्टेंट है। यह प्राकृतिक हिन्दी, हिंग्लिश और अंग्रेजी में आपके सभी सवालों, पढ़ाई की दिक्कतों और बिजनेस योजनाओं में तत्काल मदद करता है।
            </p>
          </div>

          {/* Section 2: Study Mode */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c1222] p-4">
            <div className="flex items-center gap-2 mb-1.5 text-amber-400 font-bold text-sm">
              <GraduationCap className="h-4 w-4" />
              <span>Study Mode (पढ़ाई मोड का उपयोग)</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>टाइमटेबल और डेली स्टडी शेड्यूल बनाएं।</li>
              <li>कठिन टॉपिक को आसान भाषा और वास्तविक उदाहरणों में समझें।</li>
              <li>एग्जाम के लिए क्विक रिवीजन बुलेट नोट्स तैयार करें।</li>
              <li>MCQ अभ्यास प्रश्न और क्विज़ हल करें।</li>
            </ul>
          </div>

          {/* Section 3: Business Mode */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c1222] p-4">
            <div className="flex items-center gap-2 mb-1.5 text-emerald-400 font-bold text-sm">
              <Briefcase className="h-4 w-4" />
              <span>Business Mode (बिजनेस मोड का उपयोग)</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>कम लागत में नए लाभदायक बिजनेस आइडिया खोजें।</li>
              <li>कस्टमर पाने के लिए सोशल मीडिया और व्हाट्सएप मार्केटिंग प्लान बनाएं।</li>
              <li>प्रोडक्ट विवरण और बिक्री बढ़ाने वाले टेक्स्ट तैयार करें।</li>
              <li>लागत, मुनाफा और प्राइसिंग की सटीक गणना करें।</li>
            </ul>
          </div>

          {/* Section 4: Voice Chat & Typing */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c1222] p-4">
            <div className="flex items-center gap-2 mb-1.5 text-cyan-400 font-bold text-sm">
              <Mic className="h-4 w-4" />
              <span>वॉइस टाइपिंग और वॉइस चैट</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              नीचे इनपुट बार में मौजूद माइक आइकन दबाकर सीधे बोलकर टाइप कर सकते हैं। इसके अलावा ऊपर या साइड मेनू से "Voice Chat" स्क्रीन खोलकर बिना टाइप किए पूरी तरह बोलकर बातचीत कर सकते हैं।
            </p>
          </div>

          {/* Section 5: Mobile Android Tips */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c1222] p-4">
            <div className="flex items-center gap-2 mb-1.5 text-blue-400 font-bold text-sm">
              <Smartphone className="h-4 w-4" />
              <span>Android मोबाइल में ऐप की तरह इंस्टॉल करें</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Chrome ब्राउज़र में ऊपर दाईं ओर तीन डॉट्स (⋮) पर क्लिक करें और <strong className="text-white">"Add to Home screen" (होम स्क्रीन में जोड़ें)</strong> चुनें। NAFEES AI आपके फोन में नेटिव ऐप की तरह तेज़ काम करेगा!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-[#050811] px-5 py-3 text-center">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-cyan-500 py-2 text-xs font-bold text-black hover:bg-cyan-400 transition-colors"
          >
            समझ गया (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
