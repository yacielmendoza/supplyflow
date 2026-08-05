import React from 'react';
import { Smartphone, Download, Share, PlusSquare } from 'lucide-react';
import { Button, Sheet } from './ui';

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
    <Sheet
      open
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-accent" />
          Instalar RestoSupply PWA
        </span>
      }
      ariaLabel="Instalar RestoSupply PWA"
    >
      <div className="space-y-4">
        <p className="text-xs text-text-secondary">
          Usa RestoSupply como una aplicación nativa en tu teléfono sin pasar por la App
          Store o Google Play.
        </p>

        {isIOS ? (
          <div className="bg-inset p-3.5 rounded-control border border-border-default space-y-2 text-xs">
            <div className="font-bold text-warning">
              Instrucciones para iPhone / iPad (Safari):
            </div>
            <ol className="space-y-1.5 text-text-secondary">
              <li className="flex items-center gap-2">
                <span>1. Toca el botón</span>
                <Share className="w-4 h-4 text-accent inline" aria-hidden="true" />
                <span>
                  <strong>Compartir</strong> en la barra inferior.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span>2. Selecciona</span>
                <PlusSquare className="w-4 h-4 text-accent inline" aria-hidden="true" />
                <span>
                  <strong>"Agregar a inicio"</strong>.
                </span>
              </li>
              <li>
                3. Confirma tocando <strong>Agregar</strong> en la esquina superior.
              </li>
            </ol>
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onInstall}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Instalar Directamente
          </Button>
        )}
      </div>
    </Sheet>
  );
};
