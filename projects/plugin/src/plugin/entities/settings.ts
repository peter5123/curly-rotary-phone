import { SourceQuality } from './source-quality';

export declare type PlayButtonAction =
  | 'open-kodi'
  | 'open-browser'
  | 'copy-url'
  | 'open-vlc'
  | 'download-vlc'
  | 'share-url'
  | 'open-elementum'
  | 'open-with'
  | 'open-nplayer'
  | 'add-to-pm'
  | 'add-to-rd'
  | 'add-to-ad'
  | 'add-to-playlist'
  | 'open-infuse'
  | 'cast'
  | 'let-me-choose'
  | 'open-outplayer';

export const PlayButtonActionIos: PlayButtonAction[] = [
  'open-elementum',
  'copy-url',
  'share-url',
  'open-vlc',
  'download-vlc',
  'open-browser',
  'open-kodi',
  'open-nplayer',
  'add-to-pm',
  'add-to-rd',
  'add-to-ad',
  'add-to-playlist',
  'open-infuse',
  'cast',
  'open-outplayer',
];

export const PlayButtonActionAndroid: PlayButtonAction[] = [
  'open-elementum',
  'copy-url',
  'share-url',
  'open-vlc',
  'open-browser',
  'open-kodi',
  'open-with',
  'add-to-pm',
  'add-to-rd',
  'add-to-ad',
  'add-to-playlist',
  'cast',
];

export interface SettingsQuality {
  quality: SourceQuality;
  displayName: string;
  enabled: boolean;
}

export interface FileSizeFilter {
  enabled: boolean;
  maxSize: number;
  minSize: number;
}

export interface SourceFilter {
  sortStreamsBy: 'size';
  sortTorrentsBy: 'balanced' | 'size' | 'seeds';
  groupStreamsByQuality: boolean;
  groupTorrentsByQuality: boolean;
  excludeTags: string[];
}

export interface PremiumizeSettings {
  disabled: boolean;
  apiKey: string;
  preferTranscodedFiles: boolean;
  preferTranscodedFilesChromecast: boolean;
}

export interface RealDebridSettings {
  disabled: boolean;
  client_id: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  client_secret: string;
}

export interface AllDebridSettings {
  disabled: boolean;
  apiKey: string;
  name: string;
}

export class Settings {
  premiumize: PremiumizeSettings = null;
  realDebrid: RealDebridSettings = null;
  allDebrid: AllDebridSettings = null;

  defaultPlayButtonAction: PlayButtonAction = 'let-me-choose';

  availablePlayButtonActions: PlayButtonAction[] = [];

  qualities: SettingsQuality[] = [
    {
      quality: '2160p',
      displayName: '2160p/4k',
      enabled: false,
    },
    {
      quality: '1080p',
      displayName: '1080p',
      enabled: true,
    },
    {
      quality: '720p',
      displayName: '720p',
      enabled: false,
    },
    {
      quality: 'other',
      displayName: 'Other',
      enabled: false,
    },
  ];

  openRemoteAfterClickOnPlay = true;
  enableEpisodeAutomaticPlaylist = true;

  fileSizeFilteringMovie: FileSizeFilter = {
    enabled: false,
    maxSize: 0,
    minSize: 0,
  };

  fileSizeFilteringTv: FileSizeFilter = {
    enabled: false,
    maxSize: 0,
    minSize: 0,
  };

  defaultTitleLang = 'en';

  sourceFilter: SourceFilter = {
    sortStreamsBy: 'size',
    sortTorrentsBy: 'balanced',
    groupStreamsByQuality: true,
    groupTorrentsByQuality: true,
    excludeTags: [],
  };

  simultaneousProviderQueries = 0;

  constructor() {
    // default actions
    this.availablePlayButtonActions = ['open-kodi', 'cast', 'open-vlc', 'share-url'];
  }
}
