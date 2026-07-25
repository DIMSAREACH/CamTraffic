# 🚀 START TODAY - Immediate Action Guide

**Read Time**: 2 minutes  
**Goal**: Get you building something useful RIGHT NOW

---

## ⚡ THE FASTEST WIN (10 Minutes)

### Add PDF Download Button

**Why**: Backend is 100% ready, just need one button

**File**: `src/web/user/citizen/pages/fines/FineDetailPage.tsx`

**What to Add**:

```typescript
// 1. Add this function
const downloadReceipt = async (fineId: string) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/fines/${fineId}/receipt/pdf/`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    if (!response.ok) throw new Error('Download failed');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fine_receipt_${fineId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Receipt downloaded successfully!');
  } catch (error) {
    toast.error('Failed to download receipt');
  }
};

// 2. Add this button in your JSX
<Button 
  onClick={() => downloadReceipt(fine.id)}
  variant="outline"
>
  <Download className="mr-2 h-4 w-4" />
  Download PDF Receipt
</Button>
```

**Test It**:
1. Go to any fine detail page
2. Click the button
3. PDF downloads! ✅

**Time**: 10 minutes  
**Impact**: Users can now download official receipts

---

## 🎯 TODAY'S 3-TASK CHALLENGE

### Task 1: PDF Download (10 min) ✅
Already described above!

---

### Task 2: Installment Calculator (2 hours)

**Create**: `src/web/user/citizen/pages/fines/InstallmentCalculatorPage.tsx`

**Copy-Paste This**:

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function InstallmentCalculatorPage({ fineId, fineAmount }: { fineId: string, fineAmount: number }) {
  const [numInstallments, setNumInstallments] = useState('6');
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculateQuote = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/fines/${fineId}/installments/quote/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ num_installments: parseInt(numInstallments) })
        }
      );
      
      if (!response.ok) throw new Error('Failed to get quote');
      
      const data = await response.json();
      setQuote(data.quote);
    } catch (error) {
      toast.error('Failed to calculate installment plan');
    } finally {
      setLoading(false);
    }
  };

  const createPlan = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/fines/${fineId}/installments/create/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ num_installments: parseInt(numInstallments) })
        }
      );
      
      if (!response.ok) throw new Error('Failed to create plan');
      
      toast.success('Payment plan created successfully!');
      // Redirect to plan details
    } catch (error) {
      toast.error('Failed to create payment plan');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Installment Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Original Fine Amount */}
          <div>
            <label className="text-sm font-medium">Fine Amount</label>
            <div className="text-2xl font-bold">${fineAmount.toFixed(2)} USD</div>
          </div>

          {/* Select Installments */}
          <div>
            <label className="text-sm font-medium">Number of Installments</label>
            <Select value={numInstallments} onValueChange={setNumInstallments}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 months</SelectItem>
                <SelectItem value="6">6 months (Recommended)</SelectItem>
                <SelectItem value="9">9 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calculate Button */}
          <Button onClick={calculateQuote} disabled={loading} className="w-full">
            {loading ? 'Calculating...' : 'Calculate Payment Plan'}
          </Button>

          {/* Quote Display */}
          {quote && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span>Base Fine Amount</span>
                <span className="font-medium">${quote.original_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Interest ({quote.interest_rate}%)</span>
                <span className="font-medium">${quote.total_interest.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Setup Fee</span>
                <span className="font-medium">${quote.setup_fee.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total Amount</span>
                <span>${quote.total_amount.toFixed(2)}</span>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Monthly Payment</div>
                  <div className="text-3xl font-bold text-blue-600">
                    ${quote.installment_amount.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">
                    for {quote.num_installments} months
                  </div>
                </div>
              </div>

              {/* Create Plan Button */}
              <Button onClick={createPlan} className="w-full mt-4">
                Create Payment Plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Test It**:
1. Go to a fine detail page
2. Click "Pay in Installments"
3. See the calculator! ✅

---

### Task 3: Add Map View (2 hours)

**Install**:
```bash
npm install leaflet react-leaflet
npm install @types/leaflet --save-dev
```

**Create**: `src/web/user/citizen/pages/violations/ViolationMapPage.tsx`

**Copy-Paste This**:

```typescript
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Violation {
  id: string;
  coordinates: { lat: number; lng: number };
  type: string;
  date: string;
  location: string;
  severity: number;
  has_fine: boolean;
  fine_amount?: number;
}

export default function ViolationMapPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchViolations();
  }, [days]);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/violations/map/?days=${days}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch violations');
      
      const data = await response.json();
      setViolations(data.violations);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (severity: number) => {
    if (severity >= 4) return '🔴'; // High
    if (severity >= 2) return '🟡'; // Medium
    return '🟢'; // Low
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Your Violations Map</span>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[600px] flex items-center justify-center">
              Loading map...
            </div>
          ) : (
            <>
              <div className="mb-4 flex gap-4 text-sm">
                <span>🔴 High Severity</span>
                <span>🟡 Medium Severity</span>
                <span>🟢 Low Severity</span>
              </div>
              
              <MapContainer
                center={[11.556374, 104.928207]} // Phnom Penh
                zoom={13}
                style={{ height: '600px', borderRadius: '8px' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {violations.map((violation) => (
                  <Marker
                    key={violation.id}
                    position={[violation.coordinates.lat, violation.coordinates.lng]}
                  >
                    <Popup>
                      <div className="p-2">
                        <div className="font-bold text-lg mb-2">
                          {getMarkerColor(violation.severity)} {violation.type}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div><strong>Location:</strong> {violation.location}</div>
                          <div><strong>Date:</strong> {new Date(violation.date).toLocaleDateString()}</div>
                          <div><strong>Severity:</strong> {violation.severity}/5</div>
                          {violation.has_fine && (
                            <div className="text-red-600 font-medium">
                              Fine: ${violation.fine_amount}
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              
              <div className="mt-4 text-sm text-gray-600">
                Total violations: {violations.length}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Test It**:
1. Go to `/citizen/violations/map`
2. See your violations on the map! ✅

---

## ✅ TODAY'S SUCCESS CHECKLIST

By end of today, you should have:
- [x] PDF download button working
- [x] Installment calculator page created
- [x] Map view showing violations

**Time**: ~5 hours total  
**Impact**: 3 major features now usable by drivers!

---

## 🎉 BONUS: Tomorrow's Quick Wins

### Push Notification Settings (2 hours)
- Add toggle in settings
- Request browser permission
- Register device with backend

### Heatmap View (2 hours)
```bash
npm install react-leaflet-heatmap-layer-v3
```
- Similar to map view
- Use `/api/violations/heatmap/`

---

## 🆘 STUCK? Common Issues

### "Button not showing"
- Check if you're on the right page
- Look for syntax errors in console
- Restart dev server

### "API returns 401"
- Check if token is in localStorage
- Login again
- Check API URL in .env

### "Map not loading"
- Check Leaflet CSS is imported
- Check marker icons are set
- Look for console errors

### "Download doesn't work"
- Check CORS settings
- Check backend is running
- Check fine ID is valid

---

## 💪 YOU GOT THIS!

**Remember**:
1. Backend APIs are ALL READY ✅
2. You just need to build UI
3. Start with PDF button (easiest)
4. Build confidence
5. Continue to others

**Each feature takes 30 min - 2 hours**

**Total time for all 6 features: 1 week**

---

## 🚀 GET STARTED NOW

Pick ONE:
- **Easiest**: PDF download button (10 min)
- **Most Useful**: Installment calculator (2 hours)
- **Most Visual**: Map view (2 hours)

Copy the code above, paste it, test it, done! ✅

**Need help?** Just ask:
- "PDF button not working"
- "How do I add the map page to routing?"
- "Installment calculator shows error"

I'll help you debug and get it working! 🎯
