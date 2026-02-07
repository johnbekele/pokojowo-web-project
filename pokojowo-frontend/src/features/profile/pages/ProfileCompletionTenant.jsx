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

  // Redirect if profile is already complete
  useEffect(() => {
    if (user?.isProfileComplete) {
      navigate('/dashboard', { replace: true });
    }
  }, [user?.isProfileComplete, navigate]);
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    age: '',
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
    languages: [],
    preferredLanguage: '',
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstname: user.firstname || searchParams.get('googleFirstName') || '',
        lastname: user.lastname || searchParams.get('googleLastName') || '',
        age: user.age || '',
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
      // Always redirect to dashboard after successful completion
      navigate('/dashboard', { replace: true });
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

  const handleNext = () => {
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
      age: formData.age ? parseInt(formData.age) : null,
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
        },
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
                    <Label htmlFor="age" className="text-sm font-medium">{t('basicInfo.age')}</Label>
                    <Input
                      id="age"
                      type="number"
                      min="18"
                      max="99"
                      value={formData.age}
                      onChange={(e) => handleInputChange('age', e.target.value)}
                      className="h-11"
                    />
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
                  <Label className="text-sm font-medium">{t('dealBreakers.title')}</Label>
                  <p className="text-xs text-muted-foreground">{t('dealBreakers.subtitle')}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { key: 'noSmokers', label: t('dealBreakers.noSmokers') },
                      { key: 'noPets', label: t('dealBreakers.noPets') },
                      { key: 'noParties', label: t('dealBreakers.noParties') },
                      { key: 'sameGenderOnly', label: t('dealBreakers.sameGenderOnly') },
                      { key: 'quietHoursRequired', label: t('dealBreakers.quietHoursRequired') },
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
                    {['English', 'Polish', 'German', 'French', 'Spanish', 'Ukrainian', 'Russian', 'Italian'].map(
                      (lang) => (
                        <div
                          key={lang}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                            formData.languages.includes(lang) ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border hover:bg-muted/80'
                          )}
                          onClick={() => {
                            if (formData.languages.includes(lang)) {
                              handleInputChange('languages', formData.languages.filter((l) => l !== lang));
                            } else {
                              handleInputChange('languages', [...formData.languages, lang]);
                            }
                          }}
                        >
                          <Checkbox
                            id={`lang-${lang}`}
                            checked={formData.languages.includes(lang)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleInputChange('languages', [...formData.languages, lang]);
                              } else {
                                handleInputChange('languages', formData.languages.filter((l) => l !== lang));
                              }
                            }}
                          />
                          <Label htmlFor={`lang-${lang}`} className="font-normal cursor-pointer text-sm">
                            {lang}
                          </Label>
                        </div>
                      )
                    )}
                  </div>
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
