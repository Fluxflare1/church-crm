'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from '@/components/ui/select';
import { createGuestFromConnectForm } from '@/lib/people';
import { sendMessageToPerson } from '@/lib/communications';
import { useRouter } from 'next/navigation';

const stage1Schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional(),
  gender: z.string(),
  dob: z.string(),
});

const stage2Schema = z.object({
  howHeard: z.string().min(1),
  invitee: z.string().optional(),
  spiritualInterests: z.array(z.string()),
  communicationsConsent: z.boolean(),
});

const stage3Schema = z.object({
  attendedWith: z.string().optional(),
  preferredChannel: z.enum(['whatsapp', 'sms', 'call', 'email']),
});

export default function ConnectPage() {
  const router = useRouter();

  const [stage, setStage] = useState(1);

  const [stage1, setStage1] = useState<any>({});
  const [stage2, setStage2] = useState<any>({});
  const [stage3, setStage3] = useState<any>({ preferredChannel: 'whatsapp' });

  async function handleFinish() {
    const data = {
      ...stage1,
      ...stage2,
      ...stage3,
    };

    const person = createGuestFromConnectForm(data);

    // optional welcome message
    sendMessageToPerson({
      personId: person.id,
      message: `Welcome ${person.firstName}! We're so glad you visited us today.`,
      via: data.preferredChannel,
    });

    router.push('/guest/dashboard');
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Welcome! Let’s Get You Connected</h1>

      {stage === 1 && (
        <div className="space-y-4">
          <Input placeholder="First Name" onChange={(e) => setStage1({ ...stage1, firstName: e.target.value })} />
          <Input placeholder="Last Name" onChange={(e) => setStage1({ ...stage1, lastName: e.target.value })} />
          <Input placeholder="Phone Number" onChange={(e) => setStage1({ ...stage1, phone: e.target.value })} />
          <Input placeholder="Email (optional)" onChange={(e) => setStage1({ ...stage1, email: e.target.value })} />
          <Select onValueChange={(v) => setStage1({ ...stage1, gender: v })}>
            <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" onChange={(e) => setStage1({ ...stage1, dob: e.target.value })} />

          <Button className="w-full" onClick={() => setStage(2)}>Next</Button>
        </div>
      )}

      {stage === 2 && (
        <div className="space-y-4">
          <Input placeholder="How did you hear about us?"
                 onChange={(e) => setStage2({ ...stage2, howHeard: e.target.value })} />

          <Input placeholder="Were you invited by someone? (optional)"
                 onChange={(e) => setStage2({ ...stage2, invitee: e.target.value })} />

          <Input placeholder="Spiritual Interests (comma separated)"
                 onChange={(e) =>
                   setStage2({
                     ...stage2,
                     spiritualInterests: e.target.value.split(',').map((x) => x.trim()),
                   })
                 } />

          <label className="flex items-center space-x-2">
            <input type="checkbox"
                   onChange={(e) =>
                     setStage2({ ...stage2, communicationsConsent: e.target.checked })
                   } />
            <span>I consent to receive updates</span>
          </label>

          <Button className="w-full" onClick={() => setStage(3)}>Next</Button>
        </div>
      )}

      {stage === 3 && (
        <div className="space-y-4">
          <Input placeholder="Did anyone attend with you? (optional)"
                 onChange={(e) =>
                   setStage3({ ...stage3, attendedWith: e.target.value })
                 } />

          <Select onValueChange={(v) => setStage3({ ...stage3, preferredChannel: v })}>
            <SelectTrigger><SelectValue placeholder="Preferred contact method" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>

          <Button className="w-full" onClick={handleFinish}>Finish</Button>
        </div>
      )}
    </div>
  );
}
