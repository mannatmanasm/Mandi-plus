import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { admin } from '../../config/firebase-admin';

export interface TruckLocationResponse {
  vehicleNumber: string;
  vehicleId: string;
  sessionId?: string;
  status: 'online' | 'offline';
  isActive?: boolean;
  lastSeen: number;
  lastSeenFormatted: string;
  sessionStarted?: number;
  sessionStartedFormatted?: string;
  location?: {
    lat: number;
    lng: number;
    speed: number;
    speedKmh: string | null;
    heading: number | null;
    timestamp: number;
    timestampFormatted: string;
    placeName?: string | null;
  } | null;
  shareToken?: string;
  shareUrl?: string;
  message?: string;
}

@Injectable()
export class TruckTrackerService {
  private readonly db: admin.database.Database;
  private readonly shareBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    if (!admin.apps.length) {
      const databaseURL = this.configService.get<string>(
        'FIREBASE_DATABASE_URL',
      );

      if (!databaseURL) {
        throw new Error('FIREBASE_DATABASE_URL is missing');
      }

      const serviceAccountB64 = this.configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT_KEY_B64',
      );

      try {
        if (serviceAccountB64) {
          const decoded = Buffer.from(
            serviceAccountB64.trim(),
            'base64',
          ).toString('utf-8');

          const serviceAccount = JSON.parse(decoded);

          serviceAccount.private_key = serviceAccount.private_key.replace(
            /\\n/g,
            '\n',
          );

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL,
          });
        } else {
          admin.initializeApp({ databaseURL });
        }
      } catch (e) {
        console.error(' Firebase initialization failed', e);
        throw e;
      }
    }

    this.db = admin.database();

    this.shareBaseUrl =
      this.configService.get<string>('TRACK_SHARE_BASE_URL') ||
      'https://track.example.com';
  }

  /* ---------- OPENSTREETMAP REVERSE GEOCODING ---------- */
  private async getPlaceName(lat: number, lng: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`;

      const res = await axios.get(url, {
        headers: {
          // Required by Nominatim policy
          'User-Agent': 'mandi-plus-tracker/1.0',
        },
        timeout: 5000,
      });

      return res.data?.display_name || null;
    } catch (err) {
      console.warn('OSM reverse geocoding failed');
      return null;
    }
  }

  async getTruckLocation(
    vehicleNumber: string,
  ): Promise<TruckLocationResponse> {
    try {
      const trimmedVehicleNumber = vehicleNumber?.trim().toLowerCase();

      if (!trimmedVehicleNumber) {
        throw new HttpException(
          'Vehicle number is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      /* ---------- VEHICLE LOOKUP ---------- */
      const vehiclesSnapshot = await this.db.ref('vehicles').once('value');

      if (!vehiclesSnapshot.exists()) {
        throw new HttpException('No vehicles found', HttpStatus.NOT_FOUND);
      }

      const vehicles = vehiclesSnapshot.val();
      let vehicleId: string | null = null;
      let vehicleData: any = null;

      for (const [vid, vehicle] of Object.entries(vehicles)) {
        if (
          (vehicle as any).vehicleNumber?.toLowerCase() === trimmedVehicleNumber
        ) {
          vehicleId = vid;
          vehicleData = vehicle;
          break;
        }
      }

      if (!vehicleId || !vehicleData) {
        throw new HttpException(
          `Vehicle not found: ${trimmedVehicleNumber}`,
          HttpStatus.NOT_FOUND,
        );
      }

      /* ---------- SESSION LOOKUP ---------- */
      const sessionsSnapshot = await this.db
        .ref('sessions')
        .orderByChild('vehicleId')
        .equalTo(vehicleId)
        .once('value');

      if (!sessionsSnapshot.exists()) {
        return {
          vehicleNumber: vehicleData.vehicleNumber,
          vehicleId,
          status: 'offline',
          lastSeen: 0,
          lastSeenFormatted: new Date(0).toISOString(),
          message: 'No sessions found for this vehicle',
          location: null,
        };
      }

      const sessions = sessionsSnapshot.val();
      /* ---------- LATEST SESSION (ACTIVE OR NOT) ---------- */
      let latestSession: any = null;
      let latestSessionId: string | null = null;

      for (const [sid, s] of Object.entries(sessions)) {
        if (!latestSession || (s as any).startedAt > latestSession.startedAt) {
          latestSession = s;
          latestSessionId = sid;
        }
      }

      if (!latestSession || !latestSessionId) {
        return {
          vehicleNumber: vehicleData.vehicleNumber,
          vehicleId,
          status: 'offline',
          lastSeen: 0,
          lastSeenFormatted: new Date(0).toISOString(),
          location: null,
        };
      }

      const isOnline =
        latestSession.isActive === true && latestSession.status === 'online';

      /* ---------- LOCATION ---------- */
      const locationSnap = await this.db
        .ref(`locations/latest/${latestSessionId}`)
        .once('value');

      const location = locationSnap.exists() ? locationSnap.val() : null;

      let placeName: string | null = null;
      if (location?.lat && location?.lng) {
        placeName = await this.getPlaceName(location.lat, location.lng);
      }

      return {
        vehicleNumber: vehicleData.vehicleNumber,
        vehicleId,
        sessionId: latestSessionId,
        status: isOnline ? 'online' : 'offline',
        lastSeen: latestSession.lastSeen,
        lastSeenFormatted: new Date(latestSession.lastSeen).toISOString(),
        location: location
          ? {
              lat: location.lat,
              lng: location.lng,
              speed: location.speed,
              speedKmh: location.speed
                ? (location.speed * 3.6).toFixed(2)
                : null,
              heading: location.heading ?? null,
              timestamp: location.timestamp,
              timestampFormatted: new Date(location.timestamp).toISOString(),
              placeName,
            }
          : null,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;

      console.error('Truck tracking error:', err);
      throw new HttpException(
        'Failed to fetch truck location',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
