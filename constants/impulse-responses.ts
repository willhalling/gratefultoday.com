/**
 * Impulse Response (IR) configurations for location-based reverb effects
 */

export interface ImpulseResponse {
  key: string;
  label: string;
  description: string;
  file: string | null;
  source: string;
  reverbTime?: string;
}

export const IMPULSE_RESPONSES: ImpulseResponse[] = [
  {
    key: 'none',
    label: 'No Location Effect',
    description: 'Use standard algorithmic reverb without convolution',
    file: null,
    source: 'N/A',
  },
  {
    key: 'cathedral',
    label: 'Cathedral',
    description: 'Massive cathedral reverb - epic, dramatic space',
    file: '/impulse-responses/cathedrral.wav',
    source: 'York Minster, UK (OpenAIR)',
    reverbTime: '7+ seconds',
  },
  {
    key: 'church',
    label: 'Church',
    description: 'Classic church reverb - warm and spacious',
    file: '/impulse-responses/church.wav',
    source: "St. Patrick's Church, Patrington, UK (OpenAIR)",
    reverbTime: '3-5 seconds',
  },
  {
    key: 'ancient-chamber',
    label: 'Ancient Chamber',
    description: 'Mysterious stone chamber - unique mystical vibe',
    file: '/impulse-responses/ancient-chamber.wav',
    source: 'Maes Howe, Orkney, Scotland (OpenAIR)',
    reverbTime: '2-4 seconds',
  },
  {
    key: 'concert-hall',
    label: 'Concert Hall',
    description: 'Professional concert hall - balanced and refined',
    file: '/impulse-responses/concert-hall.wav',
    source: 'Jack Lyons Concert Hall, University of York, UK (OpenAIR)',
    reverbTime: '2-3 seconds',
  },
  {
    key: 'small-room',
    label: 'Small Room',
    description: 'Intimate room reverb - tight and controlled',
    file: '/impulse-responses/small-room.wav',
    source: "Terry's Typing Room, UK (OpenAIR)",
    reverbTime: '0.5-1 second',
  },
];

export function getImpulseResponse(key: string): ImpulseResponse | null {
  return IMPULSE_RESPONSES.find((ir) => ir.key === key) || null;
}
