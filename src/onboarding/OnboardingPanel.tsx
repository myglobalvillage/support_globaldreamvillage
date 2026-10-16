import React, { useState, useEffect, useRef } from 'react';
import { villaAPI } from './villaApi';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  InputAdornment,
  Container,
  Avatar,
  Switch,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  Close,
  CloudUpload,
  Search,
  Add,
  Refresh,
  AdminPanelSettings,
  HomeWork,
  LocationOn,
  Payments,
  People,
  Bed,
  Bathtub,
  Info,
  CheckCircle,
  WarningAmberRounded,
  FilterList,
  Clear,
  Hotel,
  ContentCopy,
  Check,
  Person,
  Email,
  Phone,
  ContactMail,
  AccountCircle,
  Visibility,
  VerifiedUser,
  Star,
  Weekend,
  MeetingRoom,
  Gavel,
} from '@mui/icons-material';
import { Villa } from './types';
import { getOptimizedImageUrl, FALLBACK_VILLA_IMAGE } from './imageOptimizer';

type AdminPanelProps = {
  onBack?: () => void;
};

const PROPERTY_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'villa', label: 'Villa' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'cottage', label: 'Cottage' },
];

export const OnboardingPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewOwnerVilla, setViewOwnerVilla] = useState<Villa | null>(null);

  const handleCopyId = (id: string) => {
    if (!id) return;
    try {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  // Amenities from master table
  const [dbAmenities, setDbAmenities] = useState<any[]>([]);

  // Edit states
  const [editOpen, setEditOpen] = useState(false);
  const [editingVilla, setEditingVilla] = useState<Villa | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Edit form fields
  const [propertyName, setPropertyName] = useState('');
  const [propertyTitle, setPropertyTitle] = useState('');
  const [propertyType, setPropertyType] = useState('villa');
  const [propertyLocation, setPropertyLocation] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyPin, setPropertyPin] = useState('');
  const [propertyLatitude, setPropertyLatitude] = useState('');
  const [propertyLongitude, setPropertyLongitude] = useState('');
  const [propertyPrice, setPropertyPrice] = useState('100');
  const [propertyCurrency, setPropertyCurrency] = useState('INR');
  const [propertyBedrooms, setPropertyBedrooms] = useState(1);
  const [propertyBathrooms, setPropertyBathrooms] = useState(1);
  const [propertyGuestsAllowed, setPropertyGuestsAllowed] = useState(1);
  const [propertySquareFeet, setPropertySquareFeet] = useState('');
  const [propertyCancellationPolicy, setPropertyCancellationPolicy] = useState('Flexible');
  const [propertyCheckInTime, setPropertyCheckInTime] = useState('15:00');
  const [propertyCheckOutTime, setPropertyCheckOutTime] = useState('11:00');
  const [propertyDescription, setPropertyDescription] = useState('');

  // Host Details fields (Airbnb standard)
  const [hostName, setHostName] = useState('');
  const [hostAvatar, setHostAvatar] = useState('');
  const [hostBio, setHostBio] = useState('');
  const [hostIsSuperhost, setHostIsSuperhost] = useState(false);
  const [hostIsVerified, setHostIsVerified] = useState(true);
  const [hostHostingDuration, setHostHostingDuration] = useState('');
  const [hostRating, setHostRating] = useState('');
  const [hostReviews, setHostReviews] = useState('');
  const [hostResponseRate, setHostResponseRate] = useState('100%');
  const [hostResponseTime, setHostResponseTime] = useState('within an hour');
  const [hostLanguages, setHostLanguages] = useState('English, Hindi');
  const [hostEmail, setHostEmail] = useState('');
  const [hostPhone, setHostPhone] = useState('');

  // In-Depth Property Description fields (Airbnb standard)
  const [propertySpaceOverview, setPropertySpaceOverview] = useState('');
  const [propertyGuestAccess, setPropertyGuestAccess] = useState('');
  const [propertyOtherNotes, setPropertyOtherNotes] = useState('');
  const [propertyHouseRules, setPropertyHouseRules] = useState('');

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hostAvatarInputRef = useRef<HTMLInputElement>(null);

  const handleHostAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setHostAvatar(result);
      }
    };
    reader.readAsDataURL(file);
    if (hostAvatarInputRef.current) hostAvatarInputRef.current.value = '';
  };

  // Delete states
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingVillaId, setDeletingVillaId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchVillas = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const response = await villaAPI.listVillas(0, 100);
      if (response?.success && response?.data?.villas) {
        let cachedOverrides: Record<string, any> = {};
        try {
          cachedOverrides = JSON.parse(localStorage.getItem('custom_villas_cache') || '{}');
        } catch (_) {}

        const mappedVillas = response.data.villas.map((v: any) => {
          const rawId = String(v.id || v.villaId || v.villaid);
          const override = cachedOverrides[rawId] || {};
          return {
            ...v,
            ...override,
            id: rawId,
            villaId: rawId,
            price: override.price || v.price || v.pricePerNight,
          };
        });
        setVillas(mappedVillas);
      } else {
        throw new Error('Failed to retrieve listings.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to fetch villas.');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchVillas(false);
  };

  useEffect(() => {
    fetchVillas(true);
    fetchAmenities();

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchVillas(false);
    }, 10000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchVillas(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchAmenities = async () => {
    try {
      const response = await villaAPI.getAmenities();
      if (response?.success && Array.isArray(response?.data?.amenities)) {
        setDbAmenities(response.data.amenities);
      }
    } catch (err) {
      console.error('Failed to fetch amenities:', err);
    }
  };

  const handleEditOpen = (villa: Villa) => {
    setEditingVilla(villa);
    setPropertyName(villa.name || '');
    setPropertyTitle(villa.title || villa.name || '');
    setPropertyType(villa.type || 'villa');
    setPropertyLocation(villa.location || '');
    setPropertyAddress(villa.address || '');
    setPropertyCity(villa.city || '');
    setPropertyPin(villa.zipCode || villa.zipcode || '');
    setPropertyLatitude(villa.latitude ? String(villa.latitude) : '');
    setPropertyLongitude(villa.longitude ? String(villa.longitude) : '');
    setPropertyPrice(villa.pricePerNight ? String(villa.pricePerNight) : String(villa.price || '100'));
    setPropertyCurrency(villa.currency || 'INR');
    setPropertyBedrooms(villa.bedrooms || 1);
    setPropertyBathrooms(villa.bathrooms || 1);
    setPropertyGuestsAllowed(villa.guests || 1);
    setPropertySquareFeet(villa.squareFeet ? String(villa.squareFeet) : '');
    setPropertyCancellationPolicy(villa.cancellationPolicy || 'Flexible');
    setPropertyCheckInTime(villa.checkInTime || '15:00');
    setPropertyCheckOutTime(villa.checkOutTime || '11:00');

    // Parse embedded HOST_DATA from description if present
    let desc = villa.description || '';
    let embeddedHost: any = {};
    if (desc.includes('<!-- HOST_DATA:')) {
      try {
        const jsonMatch = desc.match(/<!-- HOST_DATA:\s*(\{.*?\})\s*-->/s);
        if (jsonMatch && jsonMatch[1]) {
          embeddedHost = JSON.parse(jsonMatch[1]);
        }
        desc = desc.replace(/<!-- HOST_DATA:.*?-->/s, '').trim();
      } catch (_) {}
    }

    // Map Host Details
    const h = { ...(villa.host || {}), ...embeddedHost };
    setHostName(h.name || (h.firstName ? `${h.firstName} ${h.lastName || ''}`.trim() : ''));
    setHostAvatar(h.avatar || h.avatarUrl || villa.hostAvatar || '');
    setHostBio(h.bio || '');
    setHostIsSuperhost(Boolean(h.isSuperhost));
    setHostIsVerified(h.isIdentityVerified !== false);
    setHostHostingDuration(h.hostingDuration || '');
    setHostRating(h.hostRating !== undefined && h.hostRating !== null ? String(h.hostRating) : '');
    setHostReviews(h.hostReviews !== undefined && h.hostReviews !== null ? String(h.hostReviews) : '');
    setHostResponseRate(h.responseRate || '100%');
    setHostResponseTime(h.responseTime || 'within an hour');
    setHostLanguages(Array.isArray(h.languages) ? h.languages.join(', ') : (h.languages || 'English, Hindi'));
    setHostEmail(h.email || '');
    setHostPhone(h.phone || '');

    // Map In-Depth Property Sections (with smart markdown extraction fallback)
    let space = villa.spaceOverview || '';
    let access = villa.guestAccess || '';
    let notes = villa.otherNotes || '';
    let rules = Array.isArray(villa.houseRules) ? villa.houseRules.join('\n') : (villa.houseRules || '');

    if (desc.includes('### The space')) {
      const parts = desc.split('### The space');
      desc = parts[0].trim();
      if (!space) space = (parts[1] || '').split('###')[0].trim();
    }
    if (desc.includes('### Guest access')) {
      const parts = desc.split('### Guest access');
      desc = parts[0].trim();
      if (!access) access = (parts[1] || '').split('###')[0].trim();
    }
    if (desc.includes('### Other things to note')) {
      const parts = desc.split('### Other things to note');
      desc = parts[0].trim();
      if (!notes) notes = (parts[1] || '').split('###')[0].trim();
    }
    if (desc.includes('### House rules')) {
      const parts = desc.split('### House rules');
      desc = parts[0].trim();
      if (!rules) rules = (parts[1] || '').split('###')[0].trim();
    }
    desc = desc.split('###')[0].trim();

    setPropertyDescription(desc);
    setPropertySpaceOverview(space);
    setPropertyGuestAccess(access);
    setPropertyOtherNotes(notes);
    setPropertyHouseRules(rules);

    // Map amenities checklist
    const names = (villa.amenities || []).map((a: any) => (typeof a === 'string' ? a : a.name));
    setSelectedAmenities(names);

    // Map photos
    const urls = villa.images || (villa.photos || []).map((p: any) => p.url) || [];
    setUploadedPhotos(urls.length > 0 ? urls : villa.image ? [villa.image] : []);

    setEditError('');
    setEditOpen(true);
  };

  const handleCreateOpen = () => {
    setEditingVilla(null);
    setPropertyName('');
    setPropertyTitle('');
    setPropertyType('villa');
    setPropertyLocation('');
    setPropertyAddress('');
    setPropertyCity('');
    setPropertyPin('');
    setPropertyLatitude('');
    setPropertyLongitude('');
    setPropertyPrice('100');
    setPropertyCurrency('INR');
    setPropertyBedrooms(1);
    setPropertyBathrooms(1);
    setPropertyGuestsAllowed(1);
    setPropertySquareFeet('');
    setPropertyCancellationPolicy('Flexible');
    setPropertyCheckInTime('15:00');
    setPropertyCheckOutTime('11:00');
    setPropertyDescription('');
    setHostName('');
    setHostAvatar('');
    setHostBio('');
    setHostIsSuperhost(false);
    setHostIsVerified(true);
    setHostHostingDuration('');
    setHostRating('');
    setHostReviews('');
    setHostResponseRate('100%');
    setHostResponseTime('within an hour');
    setHostLanguages('English, Hindi');
    setHostEmail('');
    setHostPhone('');
    setPropertySpaceOverview('');
    setPropertyGuestAccess('');
    setPropertyOtherNotes('');
    setPropertyHouseRules('');
    setSelectedAmenities([]);
    setUploadedPhotos([]);
    setEditError('');
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditingVilla(null);
    setUploadError('');
    setUploadingCount(0);
  };

  const handleAmenityChange = (name: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  const handlePhotoUpload = (files: FileList) => {
    setUploadError('');
    const fileArray = Array.from(files);
    if (fileInputRef.current) fileInputRef.current.value = '';

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const target = e.target as FileReader;
        if (target && target.result) {
          setUploadingCount((prev) => prev + 1);
          try {
            const resData = await villaAPI.uploadImage(target.result as string);
            if (resData.success && resData.url) {
              setUploadedPhotos((prev) => [...prev, resData.url]);
            } else {
              setUploadError(resData.error || 'Failed to upload one or more photos.');
            }
          } catch (err) {
            console.error('Photo upload failed:', err);
            setUploadError('Upload failed. Please check connection and try again.');
          } finally {
            setUploadingCount((prev) => prev - 1);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (idx: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditSave = async () => {
    if (!editingVilla) {
      if (!propertyName.trim() || !propertyLocation.trim() || !propertyPrice.trim()) {
        setEditError('Property Name, Location, and Price per Day are required.');
        return;
      }
      if (uploadedPhotos.length < 5) {
        setEditError('A minimum of 5 photos are required to publish a luxury listing.');
        return;
      }
    }
    if (uploadingCount > 0) {
      setEditError('Please wait for all photos to finish uploading.');
      return;
    }

    setSaving(true);
    setEditError('');

    try {
      const amenityPayload = selectedAmenities.map((name) => {
        const matchedAmenity = dbAmenities.find((item: any) => item.name === name);
        const amenityId = matchedAmenity?.amenityId || matchedAmenity?.id || matchedAmenity?.amenity_id;
        return amenityId ? { amenityId, name } : { name };
      });

      // Construct serialized markdown description for universal compatibility
      let fullDescription = propertyDescription.trim();
      if (propertySpaceOverview.trim()) {
        fullDescription += `\n\n### The space\n${propertySpaceOverview.trim()}`;
      }
      if (propertyGuestAccess.trim()) {
        fullDescription += `\n\n### Guest access\n${propertyGuestAccess.trim()}`;
      }
      if (propertyOtherNotes.trim()) {
        fullDescription += `\n\n### Other things to note\n${propertyOtherNotes.trim()}`;
      }
      if (propertyHouseRules.trim()) {
        fullDescription += `\n\n### House rules\n${propertyHouseRules.trim()}`;
      }

      const hostPayload = {
        ...(editingVilla?.host || {}),
        name: hostName.trim() || undefined,
        firstName: hostName.trim() ? hostName.trim().split(' ')[0] : undefined,
        lastName: hostName.trim() ? hostName.trim().split(' ').slice(1).join(' ') : undefined,
        avatar: hostAvatar.trim() || undefined,
        avatarUrl: hostAvatar.trim() || undefined,
        bio: hostBio.trim() || undefined,
        isSuperhost: hostIsSuperhost,
        isIdentityVerified: hostIsVerified,
        hostingDuration: hostHostingDuration.trim() || undefined,
        hostRating: hostRating.trim() ? parseFloat(hostRating.trim()) : undefined,
        hostReviews: hostReviews.trim() ? parseInt(hostReviews.trim(), 10) : undefined,
        responseRate: hostResponseRate.trim() || undefined,
        responseTime: hostResponseTime.trim() || undefined,
        languages: hostLanguages.split(',').map((s) => s.trim()).filter(Boolean),
        email: hostEmail.trim() || undefined,
        phone: hostPhone.trim() || undefined,
      };

      // Guaranteed metadata persistence across all backends:
      fullDescription += `\n\n<!-- HOST_DATA: ${JSON.stringify(hostPayload)} -->`;

      const rulesArray = propertyHouseRules.split('\n').map((s) => s.trim()).filter(Boolean);

      const payload = {
        name: propertyName.trim(),
        title: propertyTitle.trim() || propertyName.trim(),
        type: propertyType,
        location: propertyLocation.trim(),
        address: propertyAddress.trim(),
        city: propertyCity.trim(),
        zipCode: propertyPin.trim(),
        latitude: propertyLatitude.trim() ? parseFloat(propertyLatitude.trim()) : null,
        longitude: propertyLongitude.trim() ? parseFloat(propertyLongitude.trim()) : null,
        pricePerNight: parseFloat(propertyPrice) || 0,
        currency: propertyCurrency,
        bedrooms: propertyBedrooms,
        bathrooms: propertyBathrooms,
        guests: propertyGuestsAllowed,
        squareFeet: propertySquareFeet.trim() ? parseInt(propertySquareFeet.trim(), 10) : null,
        cancellationPolicy: propertyCancellationPolicy,
        checkInTime: propertyCheckInTime,
        checkOutTime: propertyCheckOutTime,
        description: fullDescription,
        spaceOverview: propertySpaceOverview.trim() || undefined,
        guestAccess: propertyGuestAccess.trim() || undefined,
        otherNotes: propertyOtherNotes.trim() || undefined,
        houseRules: rulesArray.length > 0 ? rulesArray : undefined,
        host: hostPayload,
        amenities: amenityPayload,
        photos: uploadedPhotos,
      };

      if (editingVilla) {
        const targetId = editingVilla.id.toString();
        let resVillaData: any = {};
        try {
          const res = await villaAPI.updateVilla(targetId, payload);
          if (res?.success) {
            resVillaData = res?.data?.villa || res?.data || {};
          }
        } catch (apiErr) {
          console.warn('Backend updateVilla notice (syncing to local cache):', apiErr);
        }

        const mappedUpdatedVilla: Villa = {
          ...editingVilla,
          ...resVillaData,
          id: targetId,
          name: propertyName.trim(),
          title: propertyTitle.trim() || propertyName.trim(),
          price: parseFloat(propertyPrice) || editingVilla.price,
          pricePerNight: parseFloat(propertyPrice) || editingVilla.price,
          location: propertyLocation.trim(),
          description: fullDescription,
          spaceOverview: propertySpaceOverview.trim() || undefined,
          guestAccess: propertyGuestAccess.trim() || undefined,
          otherNotes: propertyOtherNotes.trim() || undefined,
          houseRules: rulesArray,
          host: {
            ...(editingVilla.host || {}),
            ...hostPayload,
          },
          image: uploadedPhotos[0] || resVillaData.image || editingVilla.image || '',
          images: uploadedPhotos.length > 0 ? uploadedPhotos : (editingVilla.images || []),
          photos: uploadedPhotos.map((url, i) => ({ photoId: `p-${i}`, url, displayOrder: i })),
        };

        // Cache locally so changes immediately reflect across DetailPage and SearchPage
        try {
          const cache = JSON.parse(localStorage.getItem('custom_villas_cache') || '{}');
          cache[targetId] = mappedUpdatedVilla;
          localStorage.setItem('custom_villas_cache', JSON.stringify(cache));
        } catch (_) {}

        setVillas((prev) => prev.map((v) => (v.id.toString() === targetId ? mappedUpdatedVilla : v)));
        handleEditClose();
        fetchVillas();
      } else {
        const res = await villaAPI.createVilla(payload);
        if (res?.success) {
          const createdVilla: Villa = res?.data?.villa || res?.data || {
            id: Date.now(),
            ...payload,
            name: propertyName.trim(),
            title: propertyTitle.trim() || propertyName.trim(),
            description: fullDescription,
            spaceOverview: propertySpaceOverview.trim() || undefined,
            guestAccess: propertyGuestAccess.trim() || undefined,
            otherNotes: propertyOtherNotes.trim() || undefined,
            houseRules: rulesArray,
            host: hostPayload,
            image: uploadedPhotos[0] || '',
            images: uploadedPhotos,
            photos: uploadedPhotos.map((url, i) => ({ photoId: `p-${i}`, url, displayOrder: i })),
          };
          setVillas((prev) => [createdVilla, ...prev]);
          handleEditClose();
          fetchVillas();
        } else {
          throw new Error(res?.message || 'Failed to create listing.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOpen = (id: string, name: string) => {
    setDeletingVillaId(id);
    setDeletingName(name);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingVillaId) return;
    setDeleting(true);
    try {
      const res = await villaAPI.deleteVilla(deletingVillaId);
      if (res?.success) {
        setDeleteOpen(false);
        setDeletingVillaId(null);
        fetchVillas();
      } else {
        throw new Error(res?.message || 'Failed to delete listing.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Unable to delete property.');
    } finally {
      setDeleting(false);
    }
  };

  // Filter villas by search query (title, Villa ID, location, city, property owner) and property type
  const filteredVillas = villas.filter((v) => {
    const q = searchQuery.trim().toLowerCase();
    const villaIdStr = String(v.id || (v as any).villaId || (v as any).villaid || '').toLowerCase();
    const hostName = (v.host?.name || `${v.host?.firstName || ''} ${v.host?.lastName || ''}`).toLowerCase();
    const hostEmail = (v.host?.email || '').toLowerCase();
    const hostPhone = (v.host?.phone || '').toLowerCase();
    const hostId = (v.hostId || v.host?.userId || v.host?.id || '').toLowerCase();

    const matchesSearch =
      !q ||
      villaIdStr.includes(q) ||
      v.name?.toLowerCase().includes(q) ||
      v.title?.toLowerCase().includes(q) ||
      v.location?.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q) ||
      hostName.includes(q) ||
      hostEmail.includes(q) ||
      hostPhone.includes(q) ||
      hostId.includes(q);

    const matchesType =
      selectedType === 'all' ||
      (v.type || 'villa').toLowerCase() === selectedType.toLowerCase();

    return matchesSearch && matchesType;
  });

  // Calculate Overview Stats
  const totalListings = villas.length;
  const uniqueCities = new Set(
    villas.map((v) => v.city || v.location?.split(',')[0]?.trim()).filter(Boolean)
  ).size;
  const uniqueHosts = new Set(
    villas.map((v) => v.hostId || v.host?.userId || v.host?.email).filter(Boolean)
  ).size;
  const avgPrice = totalListings
    ? Math.round(
        villas.reduce((sum, v) => sum + (Number(v.pricePerNight || v.price) || 0), 0) / totalListings
      )
    : 0;
  const totalGuests = villas.reduce((sum, v) => sum + (Number(v.guests) || 0), 0);

  const getTypeChipColor = (type?: string) => {
    const t = (type || 'villa').toLowerCase();
    switch (t) {
      case 'villa':
        return { bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD' };
      case 'apartment':
        return { bg: '#F3E8FF', color: '#7E22CE', border: '#E9D5FF' };
      case 'house':
        return { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' };
      case 'cabin':
        return { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
      case 'cottage':
        return { bg: '#FFEDD5', color: '#C2410C', border: '#FED7AA' };
      default:
        return { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
    }
  };

  return (
    <Box className="onboarding-root" sx={{ minHeight: '100%', backgroundColor: '#F8FAFC', fontFamily: "'Poppins', sans-serif" }}>
      {/* Top Navbar */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1.5,
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            {/* Brand Lockup + Admin Badge */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Brand lockup is provided by the console's topbar when embedded */}
              {onBack && (
                <Box
                  onClick={onBack}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer', '&:hover': { opacity: 0.9 } }}
                >
                  <img src="/gdv-icon.png" alt="Global Dream Village" width={46} height={46} style={{ objectFit: 'contain' }} />
                </Box>
              )}

              <Box
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  alignItems: 'center',
                  gap: 0.7,
                  px: 1.4,
                  py: 0.5,
                  borderRadius: '999px',
                  backgroundColor: '#E6F0FA',
                  border: '1px solid #BAE0FF',
                  color: '#004B8C',
                }}
              >
                <AdminPanelSettings sx={{ fontSize: 18 }} />
                <Typography
                  sx={{
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Admin Console
                </Typography>
              </Box>
            </Box>

            {/* Navigation & Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Tooltip title="Refresh Listings">
                <IconButton
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  sx={{
                    color: '#004B8C',
                    backgroundColor: '#F0F7FF',
                    border: '1px solid #E0E7FF',
                    '&:hover': { backgroundColor: '#E0F2FE' },
                  }}
                >
                  <Refresh
                    sx={{
                      fontSize: 20,
                      animation: refreshing ? 'spin 1s linear infinite' : 'none',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' },
                      },
                    }}
                  />
                </IconButton>
              </Tooltip>

              {onBack && (
                <Button
                  variant="outlined"
                  onClick={onBack}
                  startIcon={<ArrowBack />}
                  sx={{
                    color: '#004B8C',
                    borderColor: '#BAE0FF',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    borderRadius: '10px',
                    px: 2,
                    py: 0.8,
                    fontFamily: "'Poppins', sans-serif",
                    '&:hover': {
                      borderColor: '#004B8C',
                      backgroundColor: '#F0F7FF',
                    },
                  }}
                >
                  Back
                </Button>
              )}

              <Button
                variant="contained"
                onClick={handleCreateOpen}
                startIcon={<Add />}
                sx={{
                  backgroundColor: '#004B8C',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  borderRadius: '10px',
                  px: 2.5,
                  py: 0.9,
                  boxShadow: '0 4px 12px rgba(0, 75, 140, 0.25)',
                  fontFamily: "'Poppins', sans-serif",
                  '&:hover': {
                    backgroundColor: '#003366',
                    boxShadow: '0 6px 16px rgba(0, 75, 140, 0.35)',
                  },
                }}
              >
                Add New Property
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Container */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header Title Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <AdminPanelSettings sx={{ color: '#004B8C', fontSize: 32 }} />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: '#0F172A',
                fontSize: { xs: '24px', sm: '28px' },
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Property Management Console
            </Typography>
          </Box>
          <Typography
            variant="body1"
            sx={{
              color: '#64748B',
              fontSize: '14.5px',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Manage, publish, and monitor luxury villas, apartments, and retreats across Global Dream Village.
          </Typography>
        </Box>

        {/* Stats Overview Banner (4 KPI Cards) */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
            gap: 2.5,
            mb: 4,
          }}
        >
          {/* Card 1: Total Listings */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '12px',
                backgroundColor: '#E6F0FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#004B8C',
              }}
            >
              <HomeWork sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Properties
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', fontFamily: "'Poppins', sans-serif" }}>
                {totalListings}
              </Typography>
            </Box>
          </Paper>

          {/* Card 2: Active Locations */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '12px',
                backgroundColor: '#E0F2FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284C7',
              }}
            >
              <LocationOn sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Destinations
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', fontFamily: "'Poppins', sans-serif" }}>
                {uniqueCities} {uniqueCities === 1 ? 'City' : 'Cities'}
              </Typography>
            </Box>
          </Paper>

          {/* Card 3: Avg Nightly Rate */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '12px',
                backgroundColor: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <Payments sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Average Rate
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', fontFamily: "'Poppins', sans-serif" }}>
                ₹{avgPrice.toLocaleString('en-IN')} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>/ night</span>
              </Typography>
            </Box>
          </Paper>

          {/* Card 4: Total Guests Capacity */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '12px',
                backgroundColor: '#F3E8FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7E22CE',
              }}
            >
              <People sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Guest Capacity
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', fontFamily: "'Poppins', sans-serif" }}>
                {totalGuests} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>Guests</span>
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Listings Section Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 20px rgba(0, 75, 140, 0.04)',
          }}
        >
          {/* Toolbar: Search + Property Type Filter + Count */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            {/* Search Input */}
            <TextField
              placeholder="Search by title, Villa ID, location, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{
                width: { xs: '100%', sm: '420px' },
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: '#F8FAFC',
                  '& fieldset': { borderColor: '#E2E8F0' },
                  '&:hover fieldset': { borderColor: '#004B8C' },
                  '&.Mui-focused fieldset': { borderColor: '#004B8C', borderWidth: '2px' },
                },
                '& .MuiInputBase-input': {
                  fontSize: '14px',
                  fontFamily: "'Poppins', sans-serif",
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#64748B', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <Clear sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />

            {/* Type Filter + Count Badge */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList sx={{ color: '#64748B', fontSize: 20 }} />
                <TextField
                  select
                  size="small"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  SelectProps={{ native: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: '#F8FAFC',
                      '& fieldset': { borderColor: '#E2E8F0' },
                      '&:hover fieldset': { borderColor: '#004B8C' },
                      '&.Mui-focused fieldset': { borderColor: '#004B8C' },
                    },
                    '& select': {
                      fontSize: '13.5px',
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 500,
                      py: 1,
                    },
                  }}
                >
                  {PROPERTY_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label}
                    </option>
                  ))}
                </TextField>
              </Box>

              <Chip
                label={`Showing ${filteredVillas.length} of ${villas.length}`}
                size="small"
                sx={{
                  backgroundColor: '#E6F0FA',
                  color: '#004B8C',
                  fontWeight: 600,
                  fontSize: '12px',
                  borderRadius: '8px',
                  fontFamily: "'Poppins', sans-serif",
                }}
              />
            </Box>
          </Box>

          {/* Table or Empty / Loading States */}
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10 }}>
              <CircularProgress sx={{ color: '#004B8C', mb: 2 }} />
              <Typography variant="body2" sx={{ color: '#64748B', fontFamily: "'Poppins', sans-serif" }}>
                Loading property listings...
              </Typography>
            </Box>
          ) : error ? (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: '12px',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {error}
            </Alert>
          ) : filteredVillas.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                border: '1px dashed #CBD5E1',
              }}
            >
              <Hotel sx={{ fontSize: 48, color: '#94A3B8', mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155', mb: 0.5, fontFamily: "'Poppins', sans-serif" }}>
                No Properties Found
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mb: 2.5, fontFamily: "'Poppins', sans-serif" }}>
                Try adjusting your search criteria or add a new property listing.
              </Typography>
              <Button
                variant="contained"
                onClick={handleCreateOpen}
                startIcon={<Add />}
                sx={{
                  backgroundColor: '#004B8C',
                  '&:hover': { backgroundColor: '#003366' },
                  textTransform: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                }}
              >
                Add Property
              </Button>
            </Box>
          ) : (
            <TableContainer sx={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <Table sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px', py: 1.8, fontFamily: "'Poppins', sans-serif" }}>
                      PHOTO
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px', py: 1.8, fontFamily: "'Poppins', sans-serif" }}>
                      PROPERTY NAME & LOCATION
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px', py: 1.8, fontFamily: "'Poppins', sans-serif" }}>
                      PROPERTY OWNER / HOST
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px', py: 1.8, fontFamily: "'Poppins', sans-serif" }}>
                      TYPE
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px', py: 1.8, fontFamily: "'Poppins', sans-serif" }}>
                      PRICE / NIGHT
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px', py: 1.8, fontFamily: "'Poppins', sans-serif" }}>
                      CAPACITY
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px', py: 1.8, fontFamily: "'Poppins', sans-serif" }}>
                      AMENITIES
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px', py: 1.8, fontFamily: "'Poppins', sans-serif" }} align="right">
                      ACTIONS
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredVillas.map((villa) => {
                    const imageUrl = villa.image || (villa.images && villa.images[0]) || '';
                    const typeStyle = getTypeChipColor(villa.type);
                    const amenitiesList = (villa.amenities || []).map((a: any) =>
                      typeof a === 'string' ? a : a.name
                    );

                    return (
                      <TableRow
                        key={villa.id}
                        hover
                        sx={{
                          '&:hover': { backgroundColor: '#F8FAFC' },
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* Thumbnail */}
                        <TableCell sx={{ py: 1.8 }}>
                          <Box
                            sx={{
                              width: 80,
                              height: 60,
                              borderRadius: '10px',
                              overflow: 'hidden',
                              backgroundColor: '#E2E8F0',
                              border: '1px solid #CBD5E1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {imageUrl ? (
                              <img
                                src={getOptimizedImageUrl(imageUrl, 120)}
                                alt={villa.name}
                                loading="lazy"
                                decoding="async"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  transition: 'transform 0.25s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                onError={(e: any) => {
                                  if (e.target.src !== FALLBACK_VILLA_IMAGE) {
                                    e.target.src = FALLBACK_VILLA_IMAGE;
                                  }
                                }}
                              />
                            ) : (
                              <HomeWork sx={{ color: '#94A3B8', fontSize: 26 }} />
                            )}
                          </Box>
                        </TableCell>

                        {/* Title & Location */}
                        <TableCell sx={{ py: 1.8 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: '#0F172A',
                              fontSize: '14.5px',
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            {villa.title || villa.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.4 }}>
                            <LocationOn sx={{ fontSize: 15, color: '#004B8C' }} />
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#64748B',
                                fontSize: '12.5px',
                                fontFamily: "'Poppins', sans-serif",
                              }}
                            >
                              {villa.location || villa.city || 'Global Village'}
                            </Typography>
                          </Box>
                          {/* Villa ID Badge with Click to Copy */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.6 }}>
                            <Tooltip title={copiedId === String(villa.id || (villa as any).villaId) ? 'Copied to clipboard!' : 'Click to copy Villa ID'}>
                              <Box
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyId(String(villa.id || (villa as any).villaId));
                                }}
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.6,
                                  px: 1,
                                  py: 0.3,
                                  borderRadius: '6px',
                                  backgroundColor: '#F1F5F9',
                                  border: '1px solid #E2E8F0',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  '&:hover': {
                                    backgroundColor: '#E6F0FA',
                                    borderColor: '#BAE0FF',
                                  },
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    color: '#004B8C',
                                    letterSpacing: '0.2px',
                                  }}
                                >
                                  ID: {String(villa.id || (villa as any).villaId)}
                                </Typography>
                                {copiedId === String(villa.id || (villa as any).villaId) ? (
                                  <Check sx={{ fontSize: 13, color: '#16A34A' }} />
                                ) : (
                                  <ContentCopy sx={{ fontSize: 12, color: '#64748B' }} />
                                )}
                              </Box>
                            </Tooltip>
                          </Box>
                        </TableCell>

                        {/* Property Owner Cell */}
                        <TableCell sx={{ py: 1.8, minWidth: 220 }}>
                          {villa.host || villa.hostId ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                              {/* Owner Name & Avatar with Clickable View Details */}
                              <Box
                                onClick={() => setViewOwnerVilla(villa)}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  cursor: 'pointer',
                                  '&:hover .owner-name': { color: '#004B8C', textDecoration: 'underline' },
                                }}
                              >
                                <Avatar
                                  src={villa.host?.avatar || ''}
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    backgroundColor: '#004B8C',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                  }}
                                >
                                  {(villa.host?.name || villa.host?.firstName || 'O').charAt(0).toUpperCase()}
                                </Avatar>
                                <Box>
                                  <Typography
                                    className="owner-name"
                                    variant="body2"
                                    sx={{
                                      fontWeight: 700,
                                      color: '#0F172A',
                                      fontSize: '13.5px',
                                      fontFamily: "'Poppins', sans-serif",
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {villa.host?.name || (villa.host?.firstName ? `${villa.host?.firstName} ${villa.host?.lastName || ''}`.trim() : `Host #${villa.hostId}`)}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontSize: '11px',
                                      color: '#64748B',
                                      fontFamily: "'Poppins', sans-serif",
                                    }}
                                  >
                                    Owner / Host
                                  </Typography>
                                </Box>
                              </Box>

                              {/* Owner Contact (Email & Phone) */}
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.2 }}>
                                {villa.host?.email && (
                                  <Box
                                    component="a"
                                    href={`mailto:${villa.host.email}`}
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      color: '#475569',
                                      textDecoration: 'none',
                                      fontSize: '11.5px',
                                      '&:hover': { color: '#004B8C', textDecoration: 'underline' },
                                    }}
                                  >
                                    <Email sx={{ fontSize: 13, color: '#004B8C' }} />
                                    <span>{villa.host.email}</span>
                                  </Box>
                                )}
                                {villa.host?.phone && (
                                  <Box
                                    component="a"
                                    href={`tel:${villa.host.phone}`}
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      color: '#475569',
                                      textDecoration: 'none',
                                      fontSize: '11.5px',
                                      '&:hover': { color: '#004B8C', textDecoration: 'underline' },
                                    }}
                                  >
                                    <Phone sx={{ fontSize: 13, color: '#16A34A' }} />
                                    <span>{villa.host.phone}</span>
                                  </Box>
                                )}
                              </Box>

                              {/* Owner User ID Tag & Quick Modal trigger */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                                {(villa.hostId || villa.host?.userId || villa.host?.id) && (
                                  <Tooltip title={copiedId === `owner-${villa.id}` ? 'Copied Owner ID!' : 'Copy Owner ID'}>
                                    <Box
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const hId = String(villa.hostId || villa.host?.userId || villa.host?.id);
                                        handleCopyId(hId);
                                        setCopiedId(`owner-${villa.id}`);
                                      }}
                                      sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.4,
                                        px: 0.8,
                                        py: 0.2,
                                        borderRadius: '4px',
                                        backgroundColor: '#F8FAFC',
                                        border: '1px solid #E2E8F0',
                                        cursor: 'pointer',
                                        '&:hover': { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' },
                                      }}
                                    >
                                      <Person sx={{ fontSize: 11, color: '#004B8C' }} />
                                      <Typography sx={{ fontSize: '10.5px', fontFamily: 'monospace', color: '#475569', fontWeight: 600 }}>
                                        ID: {String(villa.hostId || villa.host?.userId || villa.host?.id)}
                                      </Typography>
                                      {copiedId === `owner-${villa.id}` ? (
                                        <Check sx={{ fontSize: 11, color: '#16A34A' }} />
                                      ) : (
                                        <ContentCopy sx={{ fontSize: 10, color: '#94A3B8' }} />
                                      )}
                                    </Box>
                                  </Tooltip>
                                )}
                                <Tooltip title="View Complete Owner Details">
                                  <IconButton
                                    size="small"
                                    onClick={() => setViewOwnerVilla(villa)}
                                    sx={{
                                      p: 0.3,
                                      color: '#004B8C',
                                      backgroundColor: '#E6F0FA',
                                      '&:hover': { backgroundColor: '#BAE0FF' },
                                    }}
                                  >
                                    <Visibility sx={{ fontSize: 13 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Chip
                                label="Platform Managed"
                                size="small"
                                sx={{
                                  fontSize: '11px',
                                  height: '22px',
                                  backgroundColor: '#F1F5F9',
                                  color: '#64748B',
                                  fontWeight: 600,
                                }}
                              />
                            </Box>
                          )}
                        </TableCell>

                        {/* Property Type Badge */}
                        <TableCell sx={{ py: 1.8 }}>
                          <Box
                            sx={{
                              display: 'inline-block',
                              px: 1.2,
                              py: 0.4,
                              borderRadius: '999px',
                              backgroundColor: typeStyle.bg,
                              color: typeStyle.color,
                              border: `1px solid ${typeStyle.border}`,
                              fontSize: '11.5px',
                              fontWeight: 700,
                              textTransform: 'capitalize',
                              letterSpacing: '0.3px',
                            }}
                          >
                            {villa.type || 'Villa'}
                          </Box>
                        </TableCell>

                        {/* Price */}
                        <TableCell sx={{ py: 1.8 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 800,
                              color: '#004B8C',
                              fontSize: '15px',
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            ₹{(villa.pricePerNight || villa.price || 0).toLocaleString('en-IN')}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '11px' }}>
                            per night
                          </Typography>
                        </TableCell>

                        {/* Capacity */}
                        <TableCell sx={{ py: 1.8 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#334155',
                              fontSize: '12px',
                              fontWeight: 600,
                              display: 'block',
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            {villa.guests || 1} Guests
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', fontSize: '11px' }}>
                            {villa.bedrooms || 1} Beds · {villa.bathrooms || 1} Baths
                          </Typography>
                        </TableCell>

                        {/* Amenities */}
                        <TableCell sx={{ py: 1.8, maxWidth: 180 }}>
                          {amenitiesList.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {amenitiesList.slice(0, 2).map((a, i) => (
                                <Chip
                                  key={i}
                                  label={a}
                                  size="small"
                                  sx={{
                                    fontSize: '11px',
                                    height: '22px',
                                    backgroundColor: '#F1F5F9',
                                    color: '#475569',
                                  }}
                                />
                              ))}
                              {amenitiesList.length > 2 && (
                                <Chip
                                  label={`+${amenitiesList.length - 2}`}
                                  size="small"
                                  sx={{
                                    fontSize: '10.5px',
                                    height: '22px',
                                    backgroundColor: '#E0F2FE',
                                    color: '#0369A1',
                                    fontWeight: 700,
                                  }}
                                />
                              )}
                            </Box>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#94A3B8', fontStyle: 'italic' }}>
                              None
                            </Typography>
                          )}
                        </TableCell>

                        {/* Action Buttons */}
                        <TableCell align="right" sx={{ py: 1.8 }}>
                          <Tooltip title="Edit Listing">
                            <IconButton
                              onClick={() => handleEditOpen(villa)}
                              sx={{
                                color: '#004B8C',
                                backgroundColor: '#F0F7FF',
                                mr: 1,
                                '&:hover': { backgroundColor: '#E0E7FF' },
                              }}
                              size="small"
                            >
                              <Edit sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Listing">
                            <IconButton
                              onClick={() => handleDeleteOpen(villa.id.toString(), villa.title || villa.name)}
                              sx={{
                                color: '#DC2626',
                                backgroundColor: '#FEF2F2',
                                '&:hover': { backgroundColor: '#FEE2E2' },
                              }}
                              size="small"
                            >
                              <Delete sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>

      {/* Add / Edit Dialog */}
      <Dialog
        open={editOpen}
        onClose={handleEditClose}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '20px',
            overflow: 'hidden',
            fontFamily: "'Poppins', sans-serif",
          },
        }}
      >
        {/* Dialog Header */}
        <DialogTitle
          sx={{
            py: 2.2,
            px: { xs: 2.5, sm: 4 },
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                backgroundColor: '#E6F0FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#004B8C',
              }}
            >
              {editingVilla ? <Edit sx={{ fontSize: 20 }} /> : <Add sx={{ fontSize: 22 }} />}
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '18px', fontFamily: "'Poppins', sans-serif" }}>
                {editingVilla ? 'Edit Listing Details' : 'Add New Property Listing'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', fontSize: '12px' }}>
                Fill in the verified property information, high-res photos, and guest amenities.
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleEditClose} size="small" sx={{ color: '#64748B' }}>
            <Close sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>

        {/* Dialog Form Content */}
        <DialogContent sx={{ p: { xs: 2.5, sm: 4 }, flex: 1, overflowY: 'auto' }}>
          {editError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }}>
              {editError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            {/* Villa & Host Banner when editing */}
            {editingVilla && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  p: 2,
                  borderRadius: '14px',
                  backgroundColor: '#F0F7FF',
                  border: '1px solid #BAE0FF',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#004B8C', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      Villa ID:
                    </Typography>
                    <code style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                      {String(editingVilla.id || (editingVilla as any).villaId)}
                    </code>
                  </Box>
                  <Tooltip title={copiedId === String(editingVilla.id || (editingVilla as any).villaId) ? 'Copied!' : 'Copy Villa ID'}>
                    <Button
                      size="small"
                      onClick={() => handleCopyId(String(editingVilla.id || (editingVilla as any).villaId))}
                      startIcon={
                        copiedId === String(editingVilla.id || (editingVilla as any).villaId) ? (
                          <Check sx={{ fontSize: 14 }} />
                        ) : (
                          <ContentCopy sx={{ fontSize: 14 }} />
                        )
                      }
                      sx={{
                        textTransform: 'none',
                        fontSize: '12px',
                        color: '#004B8C',
                        fontWeight: 600,
                        py: 0.3,
                        px: 1.2,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #BAE0FF',
                        '&:hover': { backgroundColor: '#E6F0FA' },
                      }}
                    >
                      {copiedId === String(editingVilla.id || (editingVilla as any).villaId) ? 'Copied' : 'Copy ID'}
                    </Button>
                  </Tooltip>
                </Box>

                {/* Assigned Property Owner Info Banner */}
                {(editingVilla.host || editingVilla.hostId) && (
                  <Box
                    sx={{
                      pt: 1.2,
                      borderTop: '1px solid #D6E4FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <Avatar
                        src={editingVilla.host?.avatar || ''}
                        sx={{
                          width: 34,
                          height: 34,
                          backgroundColor: '#004B8C',
                          fontSize: '13px',
                          fontWeight: 700,
                        }}
                      >
                        {(editingVilla.host?.name || editingVilla.host?.firstName || 'O').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '13.5px' }}>
                            {editingVilla.host?.name || (editingVilla.host?.firstName ? `${editingVilla.host?.firstName} ${editingVilla.host?.lastName || ''}`.trim() : `Host #${editingVilla.hostId}`)}
                          </Typography>
                          <Chip
                            label="Property Owner"
                            size="small"
                            sx={{
                              fontSize: '10.5px',
                              height: '18px',
                              backgroundColor: '#E6F0FA',
                              color: '#004B8C',
                              fontWeight: 700,
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.3, flexWrap: 'wrap' }}>
                          {editingVilla.host?.email && (
                            <Typography variant="caption" sx={{ color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
                              <Email sx={{ fontSize: 13, color: '#004B8C' }} /> {editingVilla.host.email}
                            </Typography>
                          )}
                          {editingVilla.host?.phone && (
                            <Typography variant="caption" sx={{ color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
                              <Phone sx={{ fontSize: 13, color: '#16A34A' }} /> {editingVilla.host.phone}
                            </Typography>
                          )}
                          {(editingVilla.hostId || editingVilla.host?.userId || editingVilla.host?.id) && (
                            <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace' }}>
                              Owner ID: {String(editingVilla.hostId || editingVilla.host?.userId || editingVilla.host?.id)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setViewOwnerVilla(editingVilla)}
                      startIcon={<AccountCircle sx={{ fontSize: 16 }} />}
                      sx={{
                        textTransform: 'none',
                        fontSize: '12px',
                        color: '#004B8C',
                        borderColor: '#BAE0FF',
                        backgroundColor: '#FFFFFF',
                        fontWeight: 600,
                        py: 0.4,
                        px: 1.4,
                        borderRadius: '8px',
                        '&:hover': { backgroundColor: '#E6F0FA', borderColor: '#004B8C' },
                      }}
                    >
                      View Owner Profile
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Section 1: Basic Information */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.8 }}>
                <Info sx={{ color: '#004B8C', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>
                  Basic Information
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Property Name"
                  required={!editingVilla}
                  fullWidth
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="e.g. Royal Azure Haven"
                />
                <TextField
                  label="Property Headline / Title"
                  fullWidth
                  value={propertyTitle}
                  onChange={(e) => setPropertyTitle(e.target.value)}
                  placeholder="e.g. Luxury 4BHK Seafront Retreat"
                />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2, mt: 2 }}>
                <TextField
                  label="Full Street Address"
                  required={!editingVilla}
                  fullWidth
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="e.g. 104 Marine Promenade, Coast Road"
                />
                <TextField
                  label="Property Type"
                  required={!editingVilla}
                  fullWidth
                  select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="villa">Villa</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="cabin">Cabin</option>
                  <option value="cottage">Cottage</option>
                </TextField>
              </Box>
            </Box>

            {/* Section 2: Location Details */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.8 }}>
                <LocationOn sx={{ color: '#004B8C', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>
                  Location & Area
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Location (Area / Neighborhood)"
                  required={!editingVilla}
                  fullWidth
                  value={propertyLocation}
                  onChange={(e) => setPropertyLocation(e.target.value)}
                  placeholder="e.g. Candolim Beachfront"
                />
                <TextField
                  label="City"
                  required={!editingVilla}
                  fullWidth
                  value={propertyCity}
                  onChange={(e) => setPropertyCity(e.target.value)}
                  placeholder="e.g. North Goa"
                />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mt: 2 }}>
                <TextField
                  label="PIN / Zipcode"
                  required={!editingVilla}
                  fullWidth
                  value={propertyPin}
                  onChange={(e) => setPropertyPin(e.target.value)}
                  placeholder="e.g. 403515"
                />
                <TextField
                  label="Latitude (optional)"
                  fullWidth
                  placeholder="e.g. 15.5189"
                  value={propertyLatitude}
                  onChange={(e) => setPropertyLatitude(e.target.value)}
                />
                <TextField
                  label="Longitude (optional)"
                  fullWidth
                  placeholder="e.g. 73.7626"
                  value={propertyLongitude}
                  onChange={(e) => setPropertyLongitude(e.target.value)}
                />
              </Box>
            </Box>

            {/* Section 3: Pricing & Capacity */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.8 }}>
                <Payments sx={{ color: '#004B8C', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>
                  Pricing & Accommodation
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Price per Night"
                  required={!editingVilla}
                  fullWidth
                  type="number"
                  value={propertyPrice}
                  onChange={(e) => setPropertyPrice(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
                <TextField
                  label="Currency"
                  required={!editingVilla}
                  fullWidth
                  select
                  value={propertyCurrency}
                  onChange={(e) => setPropertyCurrency(e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </TextField>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2, mt: 2 }}>
                <TextField
                  label="Bedrooms"
                  required={!editingVilla}
                  fullWidth
                  type="number"
                  value={propertyBedrooms}
                  onChange={(e) => setPropertyBedrooms(parseInt(e.target.value) || 0)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Bed sx={{ fontSize: 18, color: '#64748B' }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Bathrooms"
                  required={!editingVilla}
                  fullWidth
                  type="number"
                  value={propertyBathrooms}
                  onChange={(e) => setPropertyBathrooms(parseInt(e.target.value) || 0)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Bathtub sx={{ fontSize: 18, color: '#64748B' }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Guests Allowed"
                  required={!editingVilla}
                  fullWidth
                  type="number"
                  value={propertyGuestsAllowed}
                  onChange={(e) => setPropertyGuestsAllowed(parseInt(e.target.value) || 0)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <People sx={{ fontSize: 18, color: '#64748B' }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Area (Sq Ft)"
                  fullWidth
                  placeholder="e.g. 2400"
                  value={propertySquareFeet}
                  onChange={(e) => setPropertySquareFeet(e.target.value)}
                />
              </Box>
            </Box>

            {/* Section 4: Policies & Timings */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.8 }}>
                <Hotel sx={{ color: '#004B8C', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>
                  Policies & Timings
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Cancellation Policy"
                  required={!editingVilla}
                  fullWidth
                  select
                  value={propertyCancellationPolicy}
                  onChange={(e) => setPropertyCancellationPolicy(e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="Flexible">Flexible (Full refund up to 24h before)</option>
                  <option value="Moderate">Moderate (Full refund up to 5 days before)</option>
                  <option value="Strict">Strict (50% refund up to 7 days before)</option>
                </TextField>
                <TextField
                  label="Check-in Time"
                  required={!editingVilla}
                  fullWidth
                  placeholder="e.g. 15:00"
                  value={propertyCheckInTime}
                  onChange={(e) => setPropertyCheckInTime(e.target.value)}
                />
                <TextField
                  label="Check-out Time"
                  required={!editingVilla}
                  fullWidth
                  placeholder="e.g. 11:00"
                  value={propertyCheckOutTime}
                  onChange={(e) => setPropertyCheckOutTime(e.target.value)}
                />
              </Box>
            </Box>

            {/* Section 5: Amenities Selection */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                <CheckCircle sx={{ color: '#004B8C', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>
                  Amenities ({selectedAmenities.length} selected)
                </Typography>
              </Box>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 0.5 }}>
                  {dbAmenities.map((amenity) => (
                    <FormControlLabel
                      key={amenity.name}
                      control={
                        <Checkbox
                          checked={selectedAmenities.includes(amenity.name)}
                          onChange={() => handleAmenityChange(amenity.name)}
                          sx={{
                            color: '#CBD5E1',
                            '&.Mui-checked': { color: '#004B8C' },
                          }}
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: '13px', fontFamily: "'Poppins', sans-serif" }}>
                          {amenity.name}
                        </Typography>
                      }
                    />
                  ))}
                </Box>
              </Paper>
            </Box>

            {/* Section 6: Photo Uploader */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                <CloudUpload sx={{ color: '#004B8C', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>
                  Property Photos ({uploadedPhotos.length}
                  {!editingVilla ? ' / min 5 required' : ''})
                </Typography>
              </Box>

              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: '2px dashed #BAE0FF',
                  borderRadius: '16px',
                  p: 3.5,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#F0F7FF',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#004B8C',
                    backgroundColor: '#E6F0FA',
                  },
                  mb: 2,
                }}
              >
                <CloudUpload sx={{ fontSize: 42, color: '#004B8C', mb: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5, fontFamily: "'Poppins', sans-serif" }}>
                  Upload High-Resolution Photos
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                  Drag and drop files here or click to browse (PNG, JPG, WebP)
                </Typography>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                  style={{ display: 'none' }}
                />
              </Box>

              {/* Photo Preview Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 1.5 }}>
                {uploadedPhotos.map((photo, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      position: 'relative',
                      height: 85,
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid #CBD5E1',
                    }}
                  >
                    <img src={photo} alt={`Upload preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <IconButton
                      size="small"
                      onClick={() => handleRemovePhoto(idx)}
                      sx={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        color: '#fff',
                        p: 0.4,
                        '&:hover': { backgroundColor: '#DC2626' },
                      }}
                    >
                      <Close sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Box>
                ))}
                {Array.from({ length: uploadingCount }).map((_, i) => (
                  <Box
                    key={`uploading-${i}`}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 85,
                      border: '1px dashed #004B8C',
                      borderRadius: '10px',
                      backgroundColor: '#F0F7FF',
                    }}
                  >
                    <CircularProgress size={22} sx={{ color: '#004B8C', mb: 0.5 }} />
                    <Typography variant="caption" sx={{ color: '#004B8C', fontWeight: 600, fontSize: '11px' }}>
                      Uploading...
                    </Typography>
                  </Box>
                ))}
              </Box>

              {uploadError && (
                <Box
                  sx={{
                    mt: 1.5,
                    px: 2,
                    py: 1,
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Typography variant="caption" color="error" sx={{ flex: 1, fontWeight: 500 }}>
                    {uploadError}
                  </Typography>
                  <IconButton size="small" onClick={() => setUploadError('')} sx={{ p: 0.3 }}>
                    <Close sx={{ fontSize: 13 }} />
                  </IconButton>
                </Box>
              )}
            </Box>

            {/* Section 7: Host Information & Settings (Airbnb standard) */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.8 }}>
                <Person sx={{ color: '#004B8C', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>
                  Host Profile & Hospitality Settings
                </Typography>
              </Box>

              {/* Interactive Host Avatar Picker & Live Preview */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, p: 2, bgcolor: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', mb: 2 }}>
                <Avatar
                  src={hostAvatar || undefined}
                  alt={hostName || 'Host'}
                  sx={{
                    width: 64,
                    height: 64,
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    bgcolor: '#004B8C',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '22px',
                  }}
                >
                  {hostName ? hostName.split(' ').filter(Boolean).map(p => p[0]?.toUpperCase()).slice(0, 2).join('') : <AccountCircle sx={{ fontSize: 36 }} />}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
                    Host Profile Photo
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1 }}>
                    Upload host portrait or enter image URL. This exact photo will appear on the listing page.
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <input
                      ref={hostAvatarInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleHostAvatarUpload}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CloudUpload sx={{ fontSize: 16 }} />}
                      onClick={() => hostAvatarInputRef.current?.click()}
                      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', fontSize: '13px' }}
                    >
                      Upload Host Photo
                    </Button>
                    {hostAvatar && (
                      <Button
                        variant="text"
                        size="small"
                        color="error"
                        onClick={() => setHostAvatar('')}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '13px' }}
                      >
                        Remove Photo
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Host Full Name"
                  fullWidth
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Sujith Ravindran"
                />
                <TextField
                  label="Host Avatar URL (or Upload Above)"
                  fullWidth
                  value={hostAvatar.startsWith('data:') ? 'Image uploaded from file (Base64)' : hostAvatar}
                  onChange={(e) => setHostAvatar(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  disabled={hostAvatar.startsWith('data:')}
                  helperText={hostAvatar.startsWith('data:') ? 'Local file uploaded. Click "Remove Photo" above to change URL.' : ''}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
                <TextField
                  label="Hosting Experience / Duration"
                  fullWidth
                  value={hostHostingDuration}
                  onChange={(e) => setHostHostingDuration(e.target.value)}
                  placeholder="e.g. 5 months hosting / 3 years hosting"
                  helperText="Leave empty to automatically calculate from property creation date."
                />
                <TextField
                  label="Languages Spoken"
                  fullWidth
                  value={hostLanguages}
                  onChange={(e) => setHostLanguages(e.target.value)}
                  placeholder="e.g. English, Tamil, Hindi"
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
                <TextField
                  label="Host Star Rating (Optional Override)"
                  fullWidth
                  type="number"
                  inputProps={{ step: '0.1', min: '0', max: '5' }}
                  value={hostRating}
                  onChange={(e) => setHostRating(e.target.value)}
                  placeholder="e.g. 4.9 (Leave empty for dynamic DB rating)"
                  helperText="Leave empty to automatically calculate from database guest reviews."
                />
                <TextField
                  label="Host Review Count (Optional Override)"
                  fullWidth
                  type="number"
                  value={hostReviews}
                  onChange={(e) => setHostReviews(e.target.value)}
                  placeholder="e.g. 25 (Leave empty for dynamic DB reviews count)"
                  helperText="Leave empty to automatically calculate from database guest reviews."
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2, mt: 2 }}>
                <TextField
                  label="Response Rate"
                  fullWidth
                  value={hostResponseRate}
                  onChange={(e) => setHostResponseRate(e.target.value)}
                  placeholder="e.g. 100%"
                />
                <TextField
                  label="Response Time"
                  fullWidth
                  value={hostResponseTime}
                  onChange={(e) => setHostResponseTime(e.target.value)}
                  placeholder="e.g. within an hour"
                />
                <TextField
                  label="Host Contact Email"
                  fullWidth
                  value={hostEmail}
                  onChange={(e) => setHostEmail(e.target.value)}
                  placeholder="host@example.com"
                />
                <TextField
                  label="Host Contact Phone"
                  fullWidth
                  value={hostPhone}
                  onChange={(e) => setHostPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </Box>

              {/* Badges Toggles */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 2 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#F8FAFC',
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Star sx={{ color: '#E11D48', fontSize: 18 }} /> Superhost Badge
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      Renders badge & Superhost medallion in listings
                    </Typography>
                  </Box>
                  <Switch
                    checked={hostIsSuperhost}
                    onChange={(e) => setHostIsSuperhost(e.target.checked)}
                    color="error"
                  />
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#F8FAFC',
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <VerifiedUser sx={{ color: '#004B8C', fontSize: 18 }} /> Identity Verified
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      Shows verified checkmark on host profile
                    </Typography>
                  </Box>
                  <Switch
                    checked={hostIsVerified}
                    onChange={(e) => setHostIsVerified(e.target.checked)}
                    color="primary"
                  />
                </Paper>
              </Box>

              <Box sx={{ mt: 2 }}>
                <TextField
                  label="Host Bio / Story (Meet Your Host)"
                  fullWidth
                  multiline
                  rows={2}
                  value={hostBio}
                  onChange={(e) => setHostBio(e.target.value)}
                  placeholder="Share a friendly introduction about the host's background, hosting style, and local tips..."
                />
              </Box>
            </Box>

            {/* Section 8: In-Depth Property Breakdown (Airbnb Standard) */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.8 }}>
                <Weekend sx={{ color: '#004B8C', fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>
                  In-Depth Property Breakdown (About This Space)
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="General Overview (Short Summary)"
                  fullWidth
                  multiline
                  rows={2}
                  value={propertyDescription}
                  onChange={(e) => setPropertyDescription(e.target.value)}
                  placeholder="High-level overview of the property location, lifestyle, and atmosphere..."
                />

                <TextField
                  label="The Space (Rooms, Bedding, Kitchen & Amenities Layout)"
                  fullWidth
                  multiline
                  rows={3}
                  value={propertySpaceOverview}
                  onChange={(e) => setPropertySpaceOverview(e.target.value)}
                  placeholder="e.g. • Living Area: Plush sofa, 43-inch 4K Smart TV. • Bedroom: King-size bed with 300-thread count linens, silent AC..."
                  helperText="Describe room specifics, bedding comfort, ventilation, and appliances."
                />

                <TextField
                  label="Guest Access (What areas and amenities can guests access?)"
                  fullWidth
                  multiline
                  rows={2}
                  value={propertyGuestAccess}
                  onChange={(e) => setPropertyGuestAccess(e.target.value)}
                  placeholder="e.g. Full, private access to the entire apartment, covered car parking, passenger elevator, and common terrace..."
                  helperText="Describe parking, elevator access, private vs shared spaces."
                />

                <TextField
                  label="House Rules & Things to Note"
                  fullWidth
                  multiline
                  rows={2}
                  value={propertyHouseRules}
                  onChange={(e) => setPropertyHouseRules(e.target.value)}
                  placeholder="Enter house rules (one per line, e.g. Valid government ID required, Check-in: 3 PM, No smoking, Quiet hours: 10 PM)..."
                  helperText="Enter key house rules or policies (one per line)."
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>

        {/* Dialog Actions Sticky Footer */}
        <DialogActions
          sx={{
            py: 2,
            px: { xs: 2.5, sm: 4 },
            gap: 1.5,
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Button
            variant="outlined"
            onClick={handleEditClose}
            disabled={saving}
            sx={{
              textTransform: 'none',
              borderRadius: '10px',
              px: 3,
              borderColor: '#CBD5E1',
              color: '#475569',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEditSave}
            disabled={saving}
            sx={{
              backgroundColor: '#004B8C',
              '&:hover': { backgroundColor: '#003366' },
              textTransform: 'none',
              borderRadius: '10px',
              px: 3.5,
              fontWeight: 600,
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {saving ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : editingVilla ? 'Save Changes' : 'Create Listing'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Property Owner Details Dialog Modal */}
      <Dialog
        open={Boolean(viewOwnerVilla)}
        onClose={() => setViewOwnerVilla(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
            fontFamily: "'Poppins', sans-serif",
          },
        }}
      >
        <DialogTitle
          sx={{
            py: 2.2,
            px: 3,
            backgroundColor: '#004B8C',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <ContactMail sx={{ fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '18px', color: '#FFFFFF', fontFamily: "'Poppins', sans-serif" }}>
              Property Owner & Host Details
            </Typography>
          </Box>
          <IconButton onClick={() => setViewOwnerVilla(null)} size="small" sx={{ color: '#FFFFFF', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}>
            <Close sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3.5, backgroundColor: '#FAFBFC' }}>
          {viewOwnerVilla && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Profile Top Banner */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2.5,
                  p: 2.5,
                  borderRadius: '16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Avatar
                  src={viewOwnerVilla.host?.avatar || ''}
                  sx={{
                    width: 64,
                    height: 64,
                    backgroundColor: '#004B8C',
                    fontSize: '24px',
                    fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(0, 75, 140, 0.2)',
                  }}
                >
                  {(viewOwnerVilla.host?.name || viewOwnerVilla.host?.firstName || 'O').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '18px', fontFamily: "'Poppins', sans-serif" }}>
                    {viewOwnerVilla.host?.name ||
                      (viewOwnerVilla.host?.firstName
                        ? `${viewOwnerVilla.host?.firstName} ${viewOwnerVilla.host?.lastName || ''}`.trim()
                        : `Host ID: ${viewOwnerVilla.hostId || 'N/A'}`)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontSize: '12.5px', display: 'block', mt: 0.2 }}>
                    Verified Property Owner & Host
                  </Typography>

                  {/* Host ID Badge */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Box
                      onClick={() => {
                        const hId = String(viewOwnerVilla.hostId || viewOwnerVilla.host?.userId || viewOwnerVilla.host?.id || '');
                        if (hId) handleCopyId(hId);
                      }}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1,
                        py: 0.3,
                        borderRadius: '6px',
                        backgroundColor: '#F0F7FF',
                        border: '1px solid #BAE0FF',
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#E0F2FE' },
                      }}
                    >
                      <Person sx={{ fontSize: 13, color: '#004B8C' }} />
                      <Typography sx={{ fontSize: '11px', fontFamily: 'monospace', color: '#004B8C', fontWeight: 700 }}>
                        UID: {String(viewOwnerVilla.hostId || viewOwnerVilla.host?.userId || viewOwnerVilla.host?.id || 'Platform Default')}
                      </Typography>
                      {copiedId === String(viewOwnerVilla.hostId || viewOwnerVilla.host?.userId || viewOwnerVilla.host?.id) ? (
                        <Check sx={{ fontSize: 13, color: '#16A34A' }} />
                      ) : (
                        <ContentCopy sx={{ fontSize: 12, color: '#64748B' }} />
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Direct Contact Cards */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {/* Email Card */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
                    <Email sx={{ color: '#004B8C', fontSize: 18 }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Email Address
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: '#0F172A',
                      wordBreak: 'break-all',
                      fontSize: '13px',
                    }}
                  >
                    {viewOwnerVilla.host?.email || 'No email provided'}
                  </Typography>
                  {viewOwnerVilla.host?.email && (
                    <Button
                      size="small"
                      component="a"
                      href={`mailto:${viewOwnerVilla.host.email}`}
                      sx={{
                        mt: 1,
                        textTransform: 'none',
                        fontSize: '11.5px',
                        color: '#004B8C',
                        fontWeight: 600,
                        p: 0,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      Send Email ↗
                    </Button>
                  )}
                </Paper>

                {/* Phone Card */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
                    <Phone sx={{ color: '#16A34A', fontSize: 18 }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Phone / Mobile
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: '#0F172A',
                      fontSize: '13.5px',
                    }}
                  >
                    {viewOwnerVilla.host?.phone || 'No phone provided'}
                  </Typography>
                  {viewOwnerVilla.host?.phone && (
                    <Button
                      size="small"
                      component="a"
                      href={`tel:${viewOwnerVilla.host.phone}`}
                      sx={{
                        mt: 1,
                        textTransform: 'none',
                        fontSize: '11.5px',
                        color: '#16A34A',
                        fontWeight: 600,
                        p: 0,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      Call Owner ↗
                    </Button>
                  )}
                </Paper>
              </Box>

              {/* Associated Property Overview */}
              <Box
                sx={{
                  p: 2.2,
                  borderRadius: '14px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Associated Property
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.2 }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#E2E8F0',
                      flexShrink: 0,
                    }}
                  >
                    {(viewOwnerVilla.image || (viewOwnerVilla.images && viewOwnerVilla.images[0])) ? (
                      <img
                        src={getOptimizedImageUrl(viewOwnerVilla.image || (viewOwnerVilla.images ? viewOwnerVilla.images[0] : ''), 160)}
                        alt={viewOwnerVilla.name}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e: any) => {
                          if (e.target.src !== FALLBACK_VILLA_IMAGE) {
                            e.target.src = FALLBACK_VILLA_IMAGE;
                          }
                        }}
                      />
                    ) : (
                      <HomeWork sx={{ color: '#94A3B8', fontSize: 28, m: '11px' }} />
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }} noWrap>
                      {viewOwnerVilla.title || viewOwnerVilla.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 0.4 }}>
                      <LocationOn sx={{ fontSize: 13, color: '#004B8C' }} />
                      {viewOwnerVilla.location || viewOwnerVilla.city} · Villa ID: {String(viewOwnerVilla.id || (viewOwnerVilla as any).villaId)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#004B8C', fontSize: '14px' }}>
                    ₹{(viewOwnerVilla.pricePerNight || viewOwnerVilla.price || 0).toLocaleString('en-IN')}
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}> / night</span>
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
          <Button
            variant="contained"
            onClick={() => setViewOwnerVilla(null)}
            sx={{
              backgroundColor: '#004B8C',
              '&:hover': { backgroundColor: '#003366' },
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              px: 3,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            p: 1,
            maxWidth: '440px',
            fontFamily: "'Poppins', sans-serif",
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626',
            }}
          >
            <WarningAmberRounded sx={{ fontSize: 26 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '18px', fontFamily: "'Poppins', sans-serif" }}>
            Delete Property
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
            Are you sure you want to permanently delete <strong>{deletingName}</strong>? All associated reservations, photos, and listing details will be removed. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteOpen(false)}
            disabled={deleting}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              borderColor: '#CBD5E1',
              color: '#475569',
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              backgroundColor: '#DC2626',
              '&:hover': { backgroundColor: '#B91C1C' },
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OnboardingPanel;

