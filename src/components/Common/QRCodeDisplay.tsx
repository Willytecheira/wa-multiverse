import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, QrCode, RefreshCw, Download } from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  sessionId: string;
  sessionName: string;
  qrData?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  sessionId,
  sessionName,
  qrData,
  isLoading = false,
  onRefresh
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (qrData && !qrData.startsWith('data:image/')) {
      // Only generate QR if qrData is text (not already an image)
      generateQRCode(qrData);
    } else if (qrData && qrData.startsWith('data:image/')) {
      // If it's already an image, use it directly (fallback for old format)
      setQrCodeUrl(qrData);
    }
  }, [qrData]);

  const generateQRCode = async (data: string) => {
    setGenerating(true);
    try {
      console.log('Generating QR for WhatsApp data:', data.substring(0, 20) + '...');
      const url = await QRCode.toDataURL(data, {
        width: 280,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
      console.log('QR Code generated successfully');
    } catch (error) {
      console.error('Error generating QR code:', error);
      // If generation fails, we might need to truncate the data
      if (data.length > 100) {
        console.log('Data too long, truncating...');
        const shortData = data.substring(0, 100);
        try {
          const url = await QRCode.toDataURL(shortData, {
            width: 280,
            margin: 1,
            errorCorrectionLevel: 'L',
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(url);
        } catch (secondError) {
          console.error('Failed to generate even with truncated data:', secondError);
        }
      }
    } finally {
      setGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `whatsapp-qr-${sessionId}.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  return (
    <Card className="w-full max-w-md shadow-card">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center space-x-2">
          <QrCode className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">WhatsApp QR Code</CardTitle>
        </div>
        <CardDescription>
          Scan this QR code with WhatsApp to connect session: <strong>{sessionName}</strong>
        </CardDescription>
        <Badge variant="outline" className="mx-auto">
          Session ID: {sessionId.slice(-8)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          {isLoading || generating ? (
            <div className="w-64 h-64 flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                {generating ? 'Generating QR Code...' : 'Loading...'}
              </p>
            </div>
          ) : qrCodeUrl ? (
            <div className="relative group">
              <img 
                src={qrCodeUrl} 
                alt="WhatsApp QR Code" 
                className="w-64 h-64 border rounded-lg"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
            </div>
          ) : (
            <div className="w-64 h-64 flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg">
              <QrCode className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                QR Code not ready yet
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
          {qrCodeUrl && (
            <Button
              variant="outline"
              onClick={downloadQRCode}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Abre WhatsApp en tu teléfono y escanea este código QR
          </p>
          <p className="text-xs text-muted-foreground">
            El código QR expirará después de 20 segundos de ser mostrado
          </p>
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <strong>Instrucciones:</strong><br/>
            1. Abre WhatsApp<br/>
            2. Toca Menú ⋮ → WhatsApp Web<br/>
            3. Escanea este código
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;