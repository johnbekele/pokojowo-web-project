import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  MapPin,
  Home,
  Image,
  FileText,
  Settings,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';

const STEPS = [
  { id: 1, title: 'Location', icon: MapPin },
  { id: 2, title: 'Details', icon: Home },
  { id: 3, title: 'Photos', icon: Image },
  { id: 4, title: 'Description', icon: FileText },
  { id: 5, title: 'Preferences', icon: Settings },
];

const ROOM_TYPES = [
  { value: 'Single', label: 'Single Room' },
  { value: 'Double', label: 'Double Room' },
  { value: 'Suite', label: 'Suite' },
];

const BUILDING_TYPES = [
  { value: 'Apartment', label: 'Apartment' },
  { value: 'Loft', label: 'Loft' },
  { value: 'Block', label: 'Block' },
  { value: 'Detached_House', label: 'Detached House' },
];

const RENT_FOR_OPTIONS = [
  { value: 'Open to All', label: 'Open to All' },
  { value: 'Women', label: 'Women Only' },
  { value: 'Man', label: 'Men Only' },
  { value: 'Student', label: 'Students' },
  { value: 'Family', label: 'Families' },
  { value: 'Couple', label: 'Couples' },
  { value: 'Local', label: 'Locals' },
];

const CONTACT_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'chat', label: 'In-App Chat' },
];

const NEARBY_OPTIONS = [
  'Metro Station',
  'Bus Stop',
  'University',
  'Shopping Center',
  'Park',
  'Gym',
  'Hospital',
  'Restaurant',
];

export default function CreateListing() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id: listingId } = useParams();
  const isEditMode = Boolean(listingId);

  const [currentStep, setCurrentStep] = useState(1);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    price: '',
    size: '',
    maxTenants: 1,
    images: [],
    description: { en: '', pl: '' },
    availableFrom: new Date().toISOString().split('T')[0],
    roomType: 'Single',
    buildingType: 'Apartment',
    rentForOnly: ['Open to All'],
    canBeContacted: ['email', 'chat'],
    closeTo: [],
    AIHelp: false,
  });

  // Fetch listing data if editing
  const { data: existingListing, isLoading: loadingListing } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      const response = await api.get(`/listings/${listingId}`);
      return response.data;
    },
    enabled: isEditMode,
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingListing) {
      setFormData({
        address: existingListing.address || '',
        price: existingListing.price?.toString() || '',
        size: existingListing.size?.toString() || '',
        maxTenants: existingListing.maxTenants || 1,
        images: existingListing.images || [],
        description: existingListing.description || { en: '', pl: '' },
        availableFrom: existingListing.availableFrom
          ? new Date(existingListing.availableFrom).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        roomType: existingListing.roomType || 'Single',
        buildingType: existingListing.buildingType || 'Apartment',
        rentForOnly: existingListing.rentForOnly || ['Open to All'],
        canBeContacted: existingListing.canBeContacted || ['email', 'chat'],
        closeTo: existingListing.closeTo || [],
        AIHelp: existingListing.AIHelp || false,
      });
    }
  }, [existingListing]);

  // Create/Update listing mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        price: parseFloat(data.price),
        size: parseFloat(data.size),
        maxTenants: parseInt(data.maxTenants),
        availableFrom: new Date(data.availableFrom).toISOString(),
      };

      if (isEditMode) {
        const response = await api.put(`/listings/${listingId}`, payload);
        return response.data;
      } else {
        const response = await api.post('/listings/', payload);
        return response.data;
      }
    },
    onSuccess: () => {
      toast({
        title: isEditMode ? 'Listing Updated' : 'Listing Created',
        description: isEditMode
          ? 'Your listing has been updated successfully.'
          : 'Your listing has been published successfully.',
      });
      navigate('/landlord/dashboard');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'create'} listing`,
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDescriptionChange = (lang, value) => {
    setFormData((prev) => ({
      ...prev,
      description: { ...prev.description, [lang]: value },
    }));
  };

  const handleCheckboxChange = (field, value, checked) => {
    setFormData((prev) => {
      const currentValues = prev[field] || [];
      if (checked) {
        return { ...prev, [field]: [...currentValues, value] };
      } else {
        return { ...prev, [field]: currentValues.filter((v) => v !== value) };
      }
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    const uploadedUrls = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/upload/listing', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrls.push(response.data.url);
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));

      toast({
        title: 'Images Uploaded',
        description: `${uploadedUrls.length} image(s) uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error.response?.data?.detail || 'Failed to upload images',
        variant: 'destructive',
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        return formData.address.trim() !== '';
      case 2:
        return formData.price && formData.size && formData.roomType && formData.buildingType;
      case 3:
        return formData.images.length > 0;
      case 4:
        return formData.description.en.trim() !== '' || formData.description.pl.trim() !== '';
      case 5:
        return formData.rentForOnly.length > 0 && formData.canBeContacted.length > 0;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    saveMutation.mutate(formData);
  };

  const progress = (currentStep / STEPS.length) * 100;

  // Show loading while fetching existing listing
  if (isEditMode && loadingListing) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container max-w-2xl">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="address">Property Address *</Label>
              <Input
                id="address"
                placeholder="e.g., ul. Marszałkowska 10, Warsaw"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Enter the full address of your property
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="availableFrom">Available From *</Label>
              <Input
                id="availableFrom"
                type="date"
                value={formData.availableFrom}
                onChange={(e) => handleInputChange('availableFrom', e.target.value)}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Monthly Rent (PLN) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="2000"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size (m²) *</Label>
                <Input
                  id="size"
                  type="number"
                  placeholder="45"
                  value={formData.size}
                  onChange={(e) => handleInputChange('size', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="roomType">Room Type *</Label>
                <Select
                  value={formData.roomType}
                  onValueChange={(value) => handleInputChange('roomType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="buildingType">Building Type *</Label>
                <Select
                  value={formData.buildingType}
                  onValueChange={(value) => handleInputChange('buildingType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUILDING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTenants">Maximum Tenants</Label>
              <Input
                id="maxTenants"
                type="number"
                min="1"
                max="10"
                value={formData.maxTenants}
                onChange={(e) => handleInputChange('maxTenants', e.target.value)}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Property Photos *</Label>
              <p className="text-sm text-muted-foreground">
                Add photos to help potential tenants visualize your property
              </p>
            </div>

            {/* Image Upload Area */}
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={uploadingImages}
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                {uploadingImages ? (
                  <Loader2 className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
                ) : (
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                )}
                <p className="mt-2 text-sm text-muted-foreground">
                  {uploadingImages ? 'Uploading...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP up to 10MB each
                </p>
              </label>
            </div>

            {/* Image Preview Grid */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {formData.images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Property ${index + 1}`}
                      className="h-24 w-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description-en">Description (English) *</Label>
              <Textarea
                id="description-en"
                placeholder="Describe your property in English..."
                value={formData.description.en}
                onChange={(e) => handleDescriptionChange('en', e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description-pl">Description (Polish)</Label>
              <Textarea
                id="description-pl"
                placeholder="Opisz swoją nieruchomość po polsku..."
                value={formData.description.pl}
                onChange={(e) => handleDescriptionChange('pl', e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Nearby Amenities</Label>
              <div className="grid grid-cols-2 gap-2">
                {NEARBY_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`nearby-${option}`}
                      checked={formData.closeTo.includes(option)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange('closeTo', option, checked)
                      }
                    />
                    <label
                      htmlFor={`nearby-${option}`}
                      className="text-sm cursor-pointer"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Rent For *</Label>
              <p className="text-sm text-muted-foreground">
                Select who can rent this property
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {RENT_FOR_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rent-${option.value}`}
                      checked={formData.rentForOnly.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange('rentForOnly', option.value, checked)
                      }
                    />
                    <label
                      htmlFor={`rent-${option.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Contact Methods *</Label>
              <p className="text-sm text-muted-foreground">
                How can potential tenants contact you?
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {CONTACT_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`contact-${option.value}`}
                      checked={formData.canBeContacted.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange('canBeContacted', option.value, checked)
                      }
                    />
                    <label
                      htmlFor={`contact-${option.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <Checkbox
                id="aiHelp"
                checked={formData.AIHelp}
                onCheckedChange={(checked) => handleInputChange('AIHelp', checked)}
              />
              <label htmlFor="aiHelp" className="text-sm cursor-pointer">
                Enable AI assistance for tenant communication
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-2xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/landlord/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Listing' : 'Create New Listing'}</h1>
          <p className="text-muted-foreground mt-1">
            Fill in the details to list your property
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  step.id === currentStep
                    ? 'text-primary'
                    : step.id < currentStep
                    ? 'text-green-500'
                    : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    step.id === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : step.id < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-muted'
                  }`}
                >
                  {step.id < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} />
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = STEPS[currentStep - 1].icon;
                return <Icon className="h-5 w-5" />;
              })()}
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              Step {currentStep} of {STEPS.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentStep === STEPS.length ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!validateStep() || saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {isEditMode ? 'Update Listing' : 'Publish Listing'}
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={nextStep} disabled={!validateStep()}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
