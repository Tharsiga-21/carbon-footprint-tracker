import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

const QUICK_QUESTIONS = [
  "How can I reduce my transportation emissions?",
  "What is the highest contributor to my footprint?",
  "Give me 3 easy lifestyle changes I can make today.",
];

export default function AiAdvisor({ emissions, inputs }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am your AI Eco-Advisor. I've analyzed your footprint data. How can I help you optimize your carbon reduction strategy today?",
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Automatically scroll to the bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend) => {
    const messageText = textToSend || inputMessage;
    if (!messageText.trim()) return;

    // Add user message to UI
    const newUserMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Build the tailored context for Claude
    const systemPrompt = `
      You are an expert Environmental and Carbon Footprint Advisor. 
      The user is utilizing a Carbon Footprint Tracker application. 
      Here is the user's current environmental impact profile data to tailor your advice:
      
      EMISSIONS DATA (in kg CO2e):
      - Total Household Electricity Footprint: ${emissions.electricity || 0}
      - Total Vehicle Footprint: ${emissions.vehicle || 0}
      - Total Waste/Other Footprint: ${emissions.waste || 0}
      
      USER INPUT VARIABLES:
      - Monthly Electricity Bill: $${inputs.electricityBill || 0}
      - Annual Vehicle Miles Driven: ${inputs.vehicleMiles || 0} mpg
      
      Keep your guidance encouraging, actionable, practical, and highly personalized based on the data points above. Keep responses structured and concise using Markdown formatting.
    `;

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        throw new Error("Anthropic API key is missing. Please add VITE_ANTHROPIC_API_KEY to your environment variables.");
      }

      // Format messages safely for Anthropic's Messages API setup
      const formattedHistory = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Append latest message
      formattedHistory.push({ role: 'user', content: messageText });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-dont-override-in-production': 'true' // Required for client-side evaluation testing
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: systemPrompt,
          messages: formattedHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to communicate with Claude.');
      }

      const data = await response.json();
      const botResponse = data.content[0].text;

      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
    } catch (error) {
      console.error("AI Advisor Error:", error);
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: `⚠️ Error: ${error.message || "I couldn't reach the advisor network. Please check your setup and try again."}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 rounded-2xl p-6 shadow-xl border border-slate-800 max-w-4xl mx-auto h-[600px] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-lg">AI Eco-Advisor</h3>
          <p className="text-xs text-slate-400">Powered by Claude • Tailored context enabled</p>
        </div>
      </div>

      {/* Message Frame */}
      <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            <div className={`p-2 rounded-xl h-fit border ${
              msg.role === 'user' 
                ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            
            <div className={`p-4 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-tr-none' 
                : 'bg-slate-900 border border-slate-800 rounded-tl-none'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 h-fit">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              Analyzing your carbon reduction pathways...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Actions and Input footer */}
      <div>
        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => !isLoading && handleSendMessage(q)}
              disabled={isLoading}
              className="text-xs bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 px-3 py-1.5 rounded-full transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Main Form input */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            placeholder="Ask anything about minimizing your footprint..."
            className="flex-1 bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
