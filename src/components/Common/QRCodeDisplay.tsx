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
    if (qrData) {
      generateQRCode(qrData);
    }
  }, [qrData]);

  const generateQRCode = async (data: string) => {
    setGenerating(true);
    try {
      const url = await QRCode.toDataURL(data, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
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
            Open WhatsApp on your phone and scan this QR code
          </p>
          <p className="text-xs text-muted-foreground">
            The QR code will expire after 30 seconds of being displayed
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;