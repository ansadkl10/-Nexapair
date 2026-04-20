import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { QrCode, Smartphone, Loader2, ShieldCheck } from 'lucide-react';

let socket;

export default function Home() {
    const [method, setMethod] = useState('qr');
    const [phone, setPhone] = useState('');
    const [qr, setQr] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        socket = io();
        socket.on('qr', (data) => { setQr(data); setLoading(false); });
        socket.on('code', (data) => { setCode(data); setLoading(false); });
        socket.on('error', (msg) => { alert(msg); setLoading(false); });
        socket.on('connected', () => { alert("Connected! Session ID sent to your WhatsApp."); setLoading(false); });
        return () => socket.disconnect();
    }, []);

    const start = () => {
        if (method === 'pair' && !phone) return alert("Enter phone number!");
        setLoading(true); setQr(''); setCode('');
        socket.emit('start-session', { type: method, phone });
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
            <h1 className="text-6xl font-black mb-2 tracking-tighter italic">NEXA-MD</h1>
            <p className="text-gray-500 mb-10 uppercase tracking-widest text-xs">Premium Session Generator</p>
            
            <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl">
                <div className="flex bg-black p-1.5 rounded-2xl mb-8 border border-white/5">
                    <button onClick={() => setMethod('qr')} className={`flex-1 flex items-center justify-center py-4 rounded-xl transition ${method === 'qr' ? 'bg-white text-black font-bold' : 'text-gray-500 hover:text-white'}`}><QrCode size={20} className="mr-2"/> QR</button>
                    <button onClick={() => setMethod('pair')} className={`flex-1 flex items-center justify-center py-4 rounded-xl transition ${method === 'pair' ? 'bg-white text-black font-bold' : 'text-gray-500 hover:text-white'}`}><Smartphone size={20} className="mr-2"/> PAIR</button>
                </div>

                {method === 'pair' && !code && (
                    <input className="w-full bg-black border border-white/10 p-5 rounded-2xl mb-5 text-center text-2xl focus:border-white transition-all outline-none" placeholder="919012345678" onChange={(e) => setPhone(e.target.value)} />
                )}

                {!qr && !code ? (
                    <button onClick={start} disabled={loading} className="w-full bg-white text-black font-black py-5 rounded-2xl hover:scale-[0.98] active:scale-95 transition-all">
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "GENERATE CONNECTION"}
                    </button>
                ) : (
                    <div className="flex flex-col items-center py-4">
                        {qr && <img src={qr} className="w-64 h-64 rounded-2xl border-4 border-white/5 p-2 bg-white" />}
                        {code && <h2 className="text-6xl font-mono font-bold text-green-500 tracking-[8px] my-6">{code}</h2>}
                        <p className="mt-6 text-gray-600 text-sm animate-pulse">Waiting for scan / pairing...</p>
                    </div>
                )}
            </div>
            <div className="mt-10 flex items-center text-gray-700 text-xs uppercase tracking-widest"><ShieldCheck size={14} className="mr-2"/> Secure & End-to-End Encrypted</div>
        </div>
    );
}
