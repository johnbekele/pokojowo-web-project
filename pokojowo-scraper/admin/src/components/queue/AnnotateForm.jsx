import { useState } from 'react';
import { Loader2, Tag } from 'lucide-react';
import { useAnnotateListing } from '../../hooks/useQueue';
import { useToast } from '../Toast';

export const ISSUE_OPTIONS = [
  'wrong-district',
  'bad-translation',
  'wrong-price',
  'wrong-size',
  'wrong-location',
  'spam',
  'duplicate',
  'other',
];

const FIELD_OPTIONS = [
  'title',
  'description_pl',
  'description_en',
  'price',
  'rent_extra',
  'deposit',
  'size',
  'rooms',
  'floor',
  'furnished',
  'address',
  'city',
  'district',
  'coordinates',
  'offered_by',
  'phone',
  'images',
  'available_from',
  'room_type',
  'building_type',
  'other',
];

export default function AnnotateForm({ listingId }) {
  const [issue, setIssue] = useState('wrong-district');
  const [field, setField] = useState('district');
  const [comment, setComment] = useState('');
  const annotate = useAnnotateListing();
  const toast = useToast();

  const submit = (e) => {
    e.preventDefault();
    annotate.mutate(
      { id: listingId, field, issue, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Annotation saved');
          setComment('');
        },
        onError: (err) => toast.error(`Failed to annotate: ${err.message}`),
      }
    );
  };

  const selectCls =
    'border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form onSubmit={submit} className="bg-gray-50 rounded-lg border border-gray-200 p-3">
      <h4 className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
        <Tag className="w-4 h-4 text-gray-500" />
        Annotate issue
      </h4>
      <div className="flex flex-wrap gap-2 items-center">
        <select value={issue} onChange={(e) => setIssue(e.target.value)} className={selectCls}>
          {ISSUE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <select value={field} onChange={(e) => setField(e.target.value)} className={selectCls}>
          {FIELD_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comment (optional)"
          className="flex-1 min-w-[10rem] border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={annotate.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50"
        >
          {annotate.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Submit
        </button>
      </div>
    </form>
  );
}
