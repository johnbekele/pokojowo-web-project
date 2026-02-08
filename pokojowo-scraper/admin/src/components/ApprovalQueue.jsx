import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, RefreshCw, Eye, ExternalLink } from 'lucide-react';
import { scraperApi } from '../services/api';
import { formatDate, truncate, cn } from '../lib/utils';

export default function ApprovalQueue() {
  const [listings, setListings] = useState([]);
  const [queueStats, setQueueStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchListings();
    fetchQueueStats();
  }, [filter]);

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const data = await scraperApi.getPendingListings({ status: filter, limit: 50 });
      setListings(data.listings || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQueueStats = async () => {
    try {
      const data = await scraperApi.getQueueStats();
      setQueueStats(data);
    } catch (err) {
      console.error('Failed to fetch queue stats:', err);
    }
  };

  const handleApprove = async (listingId) => {
    try {
      await scraperApi.approveListing(listingId);
      fetchListings();
      fetchQueueStats();
    } catch (err) {
      alert('Failed to approve: ' + err.message);
    }
  };

  const handleReject = async (listingId, reason) => {
    try {
      await scraperApi.rejectListing(listingId, reason || 'Low quality data');
      fetchListings();
      fetchQueueStats();
    } catch (err) {
      alert('Failed to reject: ' + err.message);
    }
  };

  const handleBulkApprove = async () => {
    const pendingIds = listings.filter(l => l.status === 'pending').map(l => l._id);
    if (pendingIds.length === 0) return;

    if (!confirm(`Approve ${pendingIds.length} listings?`)) return;

    try {
      await scraperApi.bulkApprove(pendingIds);
      fetchListings();
      fetchQueueStats();
    } catch (err) {
      alert('Failed to bulk approve: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Approval Queue</h2>
          {queueStats && (
            <div className="flex gap-3 text-sm">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                {queueStats.pending || 0} pending
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                {queueStats.approved || 0} approved
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full">
                {queueStats.rejected || 0} rejected
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={fetchListings}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {filter === 'pending' && listings.length > 0 && (
            <button
              onClick={handleBulkApprove}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              Approve All
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((listing) => (
          <ListingCard
            key={listing._id}
            listing={listing}
            onApprove={() => handleApprove(listing._id)}
            onReject={(reason) => handleReject(listing._id, reason)}
            onView={() => setSelectedListing(listing)}
          />
        ))}
      </div>

      {listings.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No {filter} listings</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onApprove={() => {
            handleApprove(selectedListing._id);
            setSelectedListing(null);
          }}
          onReject={(reason) => {
            handleReject(selectedListing._id, reason);
            setSelectedListing(null);
          }}
        />
      )}
    </div>
  );
}

function ListingCard({ listing, onApprove, onReject, onView }) {
  const isPending = listing.status === 'pending';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Image */}
      {listing.images?.[0] && (
        <div className="aspect-video bg-gray-100 relative">
          <img
            src={listing.images[0]}
            alt={listing.address}
            className="w-full h-full object-cover"
            onError={(e) => e.target.style.display = 'none'}
          />
          <div className="absolute top-2 right-2">
            <span className={cn(
              'px-2 py-1 text-xs font-medium rounded-full',
              listing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              listing.status === 'approved' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            )}>
              {listing.status}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
            {listing.address || 'No address'}
          </h3>
          <span className="text-lg font-bold text-blue-600 whitespace-nowrap">
            {listing.price ? `${listing.price} zł` : 'N/A'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <span>{listing.size ? `${listing.size} m²` : 'N/A'}</span>
          <span>•</span>
          <span>{listing.source_site || 'Unknown'}</span>
          <span>•</span>
          <span>{formatDate(listing.created_at)}</span>
        </div>

        {listing.data_quality && (
          <div className="flex gap-2 mb-3">
            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
              {(listing.data_quality.completeness * 100).toFixed(0)}% complete
            </span>
            <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
              {(listing.data_quality.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onView}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          {isPending && (
            <>
              <button
                onClick={onApprove}
                className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => onReject('Low quality')}
                className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ListingDetailModal({ listing, onClose, onApprove, onReject }) {
  const [rejectReason, setRejectReason] = useState('');
  const isPending = listing.status === 'pending';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Listing Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Images */}
            <div>
              {listing.images?.length > 0 ? (
                <div className="space-y-2">
                  <img
                    src={listing.images[0]}
                    alt="Main"
                    className="w-full rounded-lg"
                  />
                  {listing.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {listing.images.slice(1, 5).map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`Image ${i + 2}`}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  No images
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xl font-semibold text-gray-900">{listing.address}</h4>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {listing.price ? `${listing.price} zł/month` : 'Price not available'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Size</p>
                  <p className="font-medium">{listing.size ? `${listing.size} m²` : 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Room Type</p>
                  <p className="font-medium">{listing.roomType || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Building</p>
                  <p className="font-medium">{listing.buildingType || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Source</p>
                  <p className="font-medium">{listing.source_site || 'N/A'}</p>
                </div>
              </div>

              {listing.description && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Description</h5>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm max-h-40 overflow-y-auto">
                    {typeof listing.description === 'object' ? (
                      <>
                        <p className="mb-2"><strong>EN:</strong> {listing.description.en}</p>
                        <p><strong>PL:</strong> {listing.description.pl}</p>
                      </>
                    ) : (
                      <p>{listing.description}</p>
                    )}
                  </div>
                </div>
              )}

              {listing.source_url && (
                <a
                  href={listing.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Original
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {isPending && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-3">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason (optional)"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg"
              />
              <button
                onClick={() => onReject(rejectReason)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={onApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
