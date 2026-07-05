import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  User,
  Phone,
  Settings,
  Heart,
  Languages
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';
import useAuthStore from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';

// Latest selectable birth date: exactly 18 years ago today
const maxDateOfBirth = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
};

const isAtLeast18 = (isoDate) => isoDate && isoDate <= maxDateOfBirth();

const STEPS = [
  { id: 'basic', number: 1, title: 'Basic Info', icon: User },
  { id: 'contact', number: 2, title: 'Contact', icon: Phone },
  { id: 'preferences', number: 3, title: 'Preferences', icon: Settings },
  { id: 'lifestyle', number: 4, title: 'Lifestyle', icon: Heart },
  { id: 'languages', number: 5, title: 'Languages', icon: Languages },
];

export default function ProfileCompletionTenant() {
  const { t } = useTranslation('profile');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, fetchUser } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(0);
  const isEditMode = user?.isProfileComplete;

  const [dobError, setDobError] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');

  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    dateOfBirth: '',
    gender: '',
    bio: '',
    phone: '',
    location: '',
    budgetMin: '',
    budgetMax: '',
    preferredLocation: '',
    leaseDuration: '12',
    cleanliness: '',
    socialLevel: '',
    guestsFrequency: '',
    noSmokers: false,
    noPets: false,
    noParties: false,
    sameGenderOnly: false,
    quietHoursRequired: false,
    noChildren: false,
    noCouples: false,
    hasPartner: false,
    hasChildren: false,
    childrenCount: '',
    languages: [],
    preferredLanguage: '',
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstname: user.firstname || searchParams.get('googleFirstName') || '',
        lastname: user.lastname || searchParams.get('googleLastName') || '',
        dateOfBirth: user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
        gender: user.gender || '',
        bio: user.bio || '',
        phone: user.phone || '',
        location: user.location || '',
        languages: user.languages || [],
        preferredLanguage: user.preferredLanguage || user.preferred_language || '',
        ...(user.tenantProfile && {
          budgetMin: user.tenantProfile.preferences?.budget?.min || '',
          budgetMax: user.tenantProfile.preferences?.budget?.max || '',
          preferredLocation: user.tenantProfile.preferences?.location || '',
          leaseDuration: user.tenantProfile.preferences?.leaseDurationMonths || '12',
          cleanliness: user.tenantProfile.flatmateTraits?.cleanliness || '',
          socialLevel: user.tenantProfile.flatmateTraits?.socialLevel || '',
          guestsFrequency: user.tenantProfile.flatmateTraits?.guestsFrequency || '',
          noSmokers: user.tenantProfile.dealBreakers?.noSmokers || false,
          noPets: user.tenantProfile.dealBreakers?.noPets || false,
          noParties: user.tenantProfile.dealBreakers?.noParties || false,
          sameGenderOnly: user.tenantProfile.dealBreakers?.sameGenderOnly || false,
          quietHoursRequired: user.tenantProfile.dealBreakers?.quietHoursRequired || false,
          noChildren: user.tenantProfile.dealBreakers?.noChildren || false,
          noCouples: user.tenantProfile.dealBreakers?.noCouples || false,
          hasPartner: user.tenantProfile.hasPartner || false,
          hasChildren: user.tenantProfile.hasChildren || false,
          childrenCount: user.tenantProfile.childrenCount || '',
        }),
      }));
    }
  }, [user, searchParams]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/profile/complete-tenant', data);
      return response.data;
    },
    onSuccess: async () => {
      await fetchUser();
      toast({
        title: t('completion.success.title'),
        description: t('completion.success.description'),
      });
      // Redirect to matches page after successful completion
      navigate('/matches', { replace: true });
    },
    onError: (error) => {
      toast({
        title: t('completion.error.title'),
        description: error.response?.data?.detail || t('completion.error.description'),
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleLanguage = (lang) => {
    if (formData.languages.includes(lang)) {
      handleInputChange('languages', formData.languages.filter((l) => l !== lang));
      if (formData.preferredLanguage === lang) {
        handleInputChange('preferredLanguage', '');
      }
    } else {
      handleInputChange('languages', [...formData.languages, lang]);
    }
  };

  const addCustomLanguage = () => {
    const cleaned = customLanguage.trim().replace(/\s+/g, ' ');
    if (!cleaned) return;
    const titled = cleaned
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    if (!formData.languages.some((l) => l.toLowerCase() === titled.toLowerCase())) {
      handleInputChange('languages', [...formData.languages, titled]);
    }
    setCustomLanguage('');
  };

  const handleNext = () => {
    if (currentStep === 0 && formData.dateOfBirth && !isAtLeast18(formData.dateOfBirth)) {
      setDobError(t('validation.mustBe18'));
      return;
    }
    setDobError('');
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    const payload = {
      firstname: formData.firstname,
      lastname: formData.lastname,
      dateOfBirth: formData.dateOfBirth || null,
      gender: formData.gender || null,
      bio: formData.bio,
      phone: formData.phone,
      location: formData.location,
      languages: formData.languages,
      preferredLanguage: formData.preferredLanguage || null,
      tenantProfile: {
        preferences: {
          budget: {
            min: formData.budgetMin ? parseInt(formData.budgetMin) : null,
            max: formData.budgetMax ? parseInt(formData.budgetMax) : null,
          },
          location: formData.preferredLocation || null,
          leaseDuration: parseInt(formData.leaseDuration),
        },
        flatmateTraits: {
          cleanliness: formData.cleanliness || null,
          socialLevel: formData.socialLevel || null,
          guestsFrequency: formData.guestsFrequency || null,
        },
        dealBreakers: {
          noSmokers: formData.noSmokers,
          noPets: formData.noPets,
          noParties: formData.noParties,
          sameGenderOnly: formData.sameGenderOnly,
          quietHoursRequired: formData.quietHoursRequired,
          noChildren: formData.noChildren,
          noCouples: formData.noCouples,
        },
        hasPartner: formData.hasPartner,
        hasChildren: formData.hasChildren,
        childrenCount: formData.hasChildren && formData.childrenCount
          ? parseInt(formData.childrenCount)
          : null,
      },
    };
    saveMutation.mutate(payload);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const CurrentIcon = STEPS[currentStep].icon;

  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-sm mb-4">
            <span className="text-sm font-medium text-foreground">{t('completion.badge')}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            {t('completion.title')}
          </h1>
          <p className="text-muted-foreground">{t('completion.subtitle')}</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">
              {t('completion.step')} {currentStep + 1} {t('completion.of')} {STEPS.length}
            </span>
            <span className="text-sm font-semibold text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />

          {/* Step indicators */}
          <div className="flex justify-between mt-6">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex flex-col items-center transition-all duration-300',
                    isCurrent ? 'scale-110' : '',
                    index <= currentStep ? 'opacity-100' : 'opacity-40'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 shadow-sm',
                      isCompleted
                        ? 'bg-success text-success-foreground'
                        : isCurrent
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'bg-card text-muted-foreground border border-border'
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                  </div>
                  <span className="mt-2 text-xs font-medium text-muted-foreground hidden sm:block">
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CurrentIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">{STEPS[currentStep].title}</CardTitle>
                <CardDescription>
                  {currentStep === 0 && t('basicInfo.subtitle')}
                  {currentStep === 1 && t('contact.subtitle')}
                  {currentStep === 2 && t('preferences.subtitle')}
                  {currentStep === 3 && t('lifestyle.subtitle')}
                  {currentStep === 4 && t('languages.subtitle')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6 space-y-5">
            {/* Step 1: Basic Info */}
            {currentStep === 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstname" className="text-sm font-medium">{t('basicInfo.firstName')}</Label>
                    <Input
                      id="firstname"
                      value={formData.firstname}
                      onChange={(e) => handleInputChange('firstname', e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastname" className="text-sm font-medium">{t('basicInfo.lastName')}</Label>
                    <Input
                      id="lastname"
                      value={formData.lastname}
                      onChange={(e) => handleInputChange('lastname', e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth" className="text-sm font-medium">{t('basicInfo.dateOfBirth')}</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      max={maxDateOfBirth()}
                      value={formData.dateOfBirth}
                      onChange={(e) => {
                        handleInputChange('dateOfBirth', e.target.value);
                        setDobError('');
                      }}
                      className="h-11"
                    />
                    {dobError ? (
                      <p className="text-xs text-destructive">{dobError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t('basicInfo.dateOfBirthHint')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm font-medium">{t('basicInfo.gender')}</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => handleInputChange('gender', value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={t('basicInfo.selectGender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('basicInfo.genderOptions.male')}</SelectItem>
                        <SelectItem value="female">{t('basicInfo.genderOptions.female')}</SelectItem>
                        <SelectItem value="other">{t('basicInfo.genderOptions.other')}</SelectItem>
                        <SelectItem value="prefer_not_to_say">{t('basicInfo.genderOptions.preferNotToSay')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm font-medium">{t('basicInfo.bio')}</Label>
                  <Textarea
                    id="bio"
                    placeholder={t('basicInfo.bioPlaceholder')}
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </>
            )}

            {/* Step 2: Contact */}
            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">{t('contact.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+48 123 456 789"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium">{t('contact.location')}</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Warsaw, Krakow"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="h-11"
                  />
                </div>
              </>
            )}

            {/* Step 3: Preferences */}
            {currentStep === 2 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="budgetMin" className="text-sm font-medium">{t('preferences.budgetMin')} (PLN)</Label>
                    <Input
                      id="budgetMin"
                      type="number"
                      placeholder="1000"
                      value={formData.budgetMin}
                      onChange={(e) => handleInputChange('budgetMin', e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budgetMax" className="text-sm font-medium">{t('preferences.budgetMax')} (PLN)</Label>
                    <Input
                      id="budgetMax"
                      type="number"
                      placeholder="3000"
                      value={formData.budgetMax}
                      onChange={(e) => handleInputChange('budgetMax', e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredLocation" className="text-sm font-medium">{t('preferences.location')}</Label>
                  <Input
                    id="preferredLocation"
                    placeholder="e.g., City center, Mokotow"
                    value={formData.preferredLocation}
                    onChange={(e) => handleInputChange('preferredLocation', e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leaseDuration" className="text-sm font-medium">{t('preferences.leaseDuration')}</Label>
                  <Select
                    value={formData.leaseDuration}
                    onValueChange={(value) => handleInputChange('leaseDuration', value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 {t('preferences.months')}</SelectItem>
                      <SelectItem value="6">6 {t('preferences.months')}</SelectItem>
                      <SelectItem value="12">12 {t('preferences.months')}</SelectItem>
                      <SelectItem value="24">24+ {t('preferences.months')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Step 4: Lifestyle */}
            {currentStep === 3 && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('lifestyle.cleanliness.label')}</Label>
                  <Select
                    value={formData.cleanliness}
                    onValueChange={(value) => handleInputChange('cleanliness', value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t('lifestyle.selectLevel')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="very_clean">{t('lifestyle.cleanliness.veryClean')}</SelectItem>
                      <SelectItem value="clean">{t('lifestyle.cleanliness.clean')}</SelectItem>
                      <SelectItem value="moderate">{t('lifestyle.cleanliness.moderate')}</SelectItem>
                      <SelectItem value="relaxed">{t('lifestyle.cleanliness.relaxed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('lifestyle.socialLevel.label')}</Label>
                  <Select
                    value={formData.socialLevel}
                    onValueChange={(value) => handleInputChange('socialLevel', value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t('lifestyle.selectLevel')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="very_social">{t('lifestyle.socialLevel.verySocial')}</SelectItem>
                      <SelectItem value="social">{t('lifestyle.socialLevel.social')}</SelectItem>
                      <SelectItem value="moderate">{t('lifestyle.socialLevel.moderate')}</SelectItem>
                      <SelectItem value="quiet">{t('lifestyle.socialLevel.quiet')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('lifestyle.guests.label')}</Label>
                  <Select
                    value={formData.guestsFrequency}
                    onValueChange={(value) => handleInputChange('guestsFrequency', value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t('lifestyle.selectFrequency')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="often">{t('lifestyle.guests.often')}</SelectItem>
                      <SelectItem value="sometimes">{t('lifestyle.guests.sometimes')}</SelectItem>
                      <SelectItem value="rarely">{t('lifestyle.guests.rarely')}</SelectItem>
                      <SelectItem value="never">{t('lifestyle.guests.never')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <Label className="text-sm font-medium">{t('coOccupants.title')}</Label>
                  <p className="text-xs text-muted-foreground">{t('coOccupants.subtitle')}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { key: 'hasPartner', label: t('coOccupants.partner') },
                      { key: 'hasChildren', label: t('coOccupants.children') },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                          formData[item.key] ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border hover:bg-muted/80'
                        )}
                        onClick={() => handleInputChange(item.key, !formData[item.key])}
                      >
                        <Checkbox
                          id={item.key}
                          checked={formData[item.key]}
                          onCheckedChange={(checked) => handleInputChange(item.key, checked)}
                        />
                        <Label htmlFor={item.key} className="font-normal cursor-pointer text-sm">
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.hasChildren && (
                    <div className="space-y-2 sm:max-w-[50%]">
                      <Label htmlFor="childrenCount" className="text-sm font-medium">
                        {t('coOccupants.childrenCount')}
                      </Label>
                      <Input
                        id="childrenCount"
                        type="number"
                        min="1"
                        max="5"
                        value={formData.childrenCount}
                        onChange={(e) => handleInputChange('childrenCount', e.target.value)}
                        className="h-11"
                      />
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <Label className="text-sm font-medium">{t('dealBreakers.title')}</Label>
                  <p className="text-xs text-muted-foreground">{t('dealBreakers.subtitle')}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { key: 'noSmokers', label: t('dealBreakers.noSmokers') },
                      { key: 'noPets', label: t('dealBreakers.noPets') },
                      { key: 'noParties', label: t('dealBreakers.noParties') },
                      { key: 'sameGenderOnly', label: t('dealBreakers.sameGenderOnly') },
                      { key: 'quietHoursRequired', label: t('dealBreakers.quietHoursRequired') },
                      { key: 'noChildren', label: t('dealBreakers.noChildren') },
                      { key: 'noCouples', label: t('dealBreakers.noCouples') },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                          formData[item.key] ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border hover:bg-muted/80'
                        )}
                        onClick={() => handleInputChange(item.key, !formData[item.key])}
                      >
                        <Checkbox
                          id={item.key}
                          checked={formData[item.key]}
                          onCheckedChange={(checked) => handleInputChange(item.key, checked)}
                        />
                        <Label htmlFor={item.key} className="font-normal cursor-pointer text-sm">
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 5: Languages */}
            {currentStep === 4 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t('languages.select')}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <div
                        key={lang}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                          formData.languages.includes(lang) ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border hover:bg-muted/80'
                        )}
                        onClick={() => toggleLanguage(lang)}
                      >
                        <Checkbox
                          id={`lang-${lang}`}
                          checked={formData.languages.includes(lang)}
                          onCheckedChange={() => toggleLanguage(lang)}
                        />
                        <Label htmlFor={`lang-${lang}`} className="font-normal cursor-pointer text-sm">
                          {lang}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customLanguage" className="text-sm font-medium">{t('languages.other')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="customLanguage"
                      placeholder={t('languages.otherPlaceholder')}
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomLanguage();
                        }
                      }}
                      className="h-11"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCustomLanguage}
                      disabled={!customLanguage.trim()}
                      className="h-11 px-5"
                    >
                      {t('languages.add')}
                    </Button>
                  </div>
                  {formData.languages.filter((l) => !SUPPORTED_LANGUAGES.includes(l)).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {formData.languages
                        .filter((l) => !SUPPORTED_LANGUAGES.includes(l))
                        .map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => toggleLanguage(lang)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-sm"
                          >
                            {lang}
                            <span aria-hidden className="text-muted-foreground">×</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredLanguage" className="text-sm font-medium">{t('languages.preferredLanguage')}</Label>
                  <Select
                    value={formData.preferredLanguage}
                    onValueChange={(value) => handleInputChange('preferredLanguage', value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t('languages.selectPreferred')} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.languages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="h-12 px-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('actions.back')}
          </Button>
          <Button
            onClick={handleNext}
            disabled={saveMutation.isPending}
            className="h-12 px-8"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('actions.saving')}
              </>
            ) : currentStep === STEPS.length - 1 ? (
              <>
                {t('actions.complete')}
                <Check className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                {t('actions.next')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Skip option */}
        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
            {t('actions.skip')}
          </Button>
        </div>
      </div>
    </div>
  );
}
