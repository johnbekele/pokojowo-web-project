import { useState } from 'react';
import { Check, ExternalLink, Loader2, Save, X, XCircle } from 'lucide-react';
import { useUpdateListing, useDecideListing } from '../../hooks/useQueue';
import { useToast } from '../Toast';
import ConfirmDialog from '../ConfirmDialog';
import ImageGallery from './ImageGallery';
import EditableFields from './EditableFields';
import FieldList from './FieldList';
import AnnotateForm from './AnnotateForm';
import QualitySummary from './QualitySummary';
import { SiteBadge, fv } from './badges';

export default function ListingDetailModal({ item, onClose }) {
  const [edits, setEdits] = useState({});
  const [confirm, setConfirm] = useState(null); // 'approve' | 'reject' | null
  const update = useUpdateListing();
  const decide = useDecideListing();
  const toast = useToast();

  const listing = item.listing || {};
  const busy = update.isPending || decide.isPending;

  const saveEdits = () => {
    if (!Object.keys(edits).length) return toast.error('No edits to save');
    update.mutate(
      { id: item._id, edits },
      {
        onSuccess: () => {
          toast.success('Edits saved');
          setEdits({});
        },
        onError: (err) => toast.error(`Save failed: ${err.message}`),
      }
    );
  };

  const runDecision = (action, reason) => {
    setConfirm(null);
    decide.mutate(
      { id: item._id, action, reason },
      {
        onSuccess: () => {
          toast.success(action === 'approve' ? 'Listing approved and published' : 'Listing rejected');
          onClose();
        },
        onError: (err) =>
          toast.error(
            err?.status === 502
              ? `Publish to main backend failed: ${err.message}`
              : `${action} failed: ${err.message}`
          ),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-4xl">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {fv(listing.title) || 'Untitled listing'}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <SiteBadge site={item.source_site} />
              <span className="capitalize">{item.status}</span>
              <a
                href={item.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline truncate"
              >
                <ExternalLink className="w-3 h-3" />
                source
              </a>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <QualitySummary item={item} />
          <ImageGallery images={fv(listing.images) || []} />
          <EditableFields listing={listing} edits={edits} setEdits={setEdits} />
          <FieldList listing={listing} />
          <AnnotateForm listingId={item._id} />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-lg">
          <button
            onClick={saveEdits}
            disabled={busy || !Object.keys(edits).length}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save edits
          </button>
          <button
            onClick={() => setConfirm('reject')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
          <button
            onClick={() => setConfirm('approve')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {decide.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Approve
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'approve'}
        title="Approve listing?"
        message="This will publish the listing to the main Pokojowo backend."
        confirmLabel="Approve and publish"
        variant="success"
        onConfirm={() => runDecision('approve')}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'reject'}
        title="Reject listing?"
        variant="danger"
        confirmLabel="Reject"
        withInput
        inputLabel="Reason"
        inputRequired
        onConfirm={(reason) => runDecision('reject', reason)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
