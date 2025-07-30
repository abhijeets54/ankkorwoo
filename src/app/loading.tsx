import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8f8f5] flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Loader2 className="w-8 h-8 text-[#2c2c27] animate-spin" />
        </div>
        <p className="text-[#2c2c27] font-medium">Loading...</p>
      </div>
    </div>
  );
}
