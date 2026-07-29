import React from 'react';
import { Smartphone, X, Download, Share, PlusSquare } from 'lucide-react';

interface PWAInstallPromptProps {
  onClose: () => void;
  onInstall?: () => void;
  isIOS?: boolean;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  onClose,
  onInstall,
  isIOS,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-slate-100">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Instalar RestoSupply PWA</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Usa RestoSupply como una aplicación nativa en tu teléfono sin pasar por la App Store o Google Play.
        </p>

        {isIOS ? (
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-amber-300 flex items-center space-x-1">
              <span>Instrucciones para iPhone / iPad (Safari):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
              <li className="flex items-center space-x-2">
                <span>1. Toca el botón</span>
                <Share className="w-4 h-4 text-emerald-400 inline" />
                <span><strong>Compartir</strong> en la barra inferior.</span>
              </li>
              <li className="flex items-center space-x-2">
                <span>2. Selecciona</span>
                <PlusSquare className="w-4 h-4 text-emerald-400 inline" />
                <span><strong>"Agregar a inicio"</strong>.</span>
              </li>
              <li>3. Confirma tocando <strong>Agregar</strong> en la esquina superior.</li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={onInstall}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Instalar Directamente</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
