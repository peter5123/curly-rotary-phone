import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, concatMap, last, map, switchMap } from 'rxjs/operators';
import { LastPlayedSource } from '../../entities/last-played-source';
import { SourceQuery } from '../../entities/source-query';
import { StreamLink, StreamLinkSource } from '../../entities/stream-link-source';
import { TorrentSource } from '../../entities/torrent-source';
import { AllDebridGetStreamLinkQuery } from '../../queries/debrids/all-debrid/all-debrid-get-stream-link.query';
import { AllDebridSourcesFromTorrentsQuery } from '../../queries/debrids/all-debrid/all-debrid-sources-from-torrents.query';
import { PremiumizeGetStreamLinkQuery } from '../../queries/debrids/premiumize/premiumize-get-stream-link.query';
import { PremiumizeSourcesFromTorrentsQuery } from '../../queries/debrids/premiumize/premiumize-sources-from-torrents.query';
import { RealDebridGetStreamLinkQuery } from '../../queries/debrids/real-debrid/real-debrid-get-stream-link.query';
import { RealDebridSourcesFromTorrentsQuery } from '../../queries/debrids/real-debrid/real-debrid-sources-from-torrents.query';
import { PremiumizeAccountInfoForm } from '../premiumize/forms/account/premiumize-account-info.form';
import {
  episodeFoundInStreamLinks,
  getScoreMatchingName,
  getSourcesByQuality,
  removeDuplicates,
  sortTorrentsByPackage,
  sortTorrentsBySize
} from '../tools';

@Injectable()
export class CachedTorrentSourceService {
  constructor() {}

  getFromTorrents(torrents: TorrentSource[], sourceQuery: SourceQuery) {
    return PremiumizeSourcesFromTorrentsQuery.getData(torrents).pipe(
      switchMap((pmSources) => {
        return RealDebridSourcesFromTorrentsQuery.getData(torrents, sourceQuery).pipe(
          switchMap((rdSources) => {
            return AllDebridSourcesFromTorrentsQuery.getData(torrents).pipe(
              map((adSources) => {
                return adSources.concat(...pmSources, ...rdSources);
              })
            );
          })
        );
      })
    );
  }

  getStreamLinks(source: StreamLinkSource, sourceQuery: SourceQuery) {
    let obs: Observable<StreamLink[]> = of(source.streamLinks);
    if (source.premiumizeTransferDirectdlDto) {
      obs = PremiumizeGetStreamLinkQuery.getData(source, sourceQuery);
    } else if (source.realDebridLinks) {
      obs = RealDebridGetStreamLinkQuery.getData(source, sourceQuery);
    } else if (source.allDebridMagnetStatusMagnet) {
      obs = AllDebridGetStreamLinkQuery.getData(source, sourceQuery);
    }
    return obs;
  }

  getBestSource(
    streamLinkSources: StreamLinkSource[],
    sourceQuery: SourceQuery,
    lastPlayedSource?: LastPlayedSource
  ): Observable<StreamLinkSource> {
    if (streamLinkSources.length === 0) {
      return of(null);
    }

    streamLinkSources = removeDuplicates<StreamLinkSource>(streamLinkSources, 'id');

    const sourceQuality = getSourcesByQuality<StreamLinkSource>(streamLinkSources, sortTorrentsBySize);
    sortTorrentsByPackage(sourceQuality.sources2160p);
    sortTorrentsByPackage(sourceQuality.sources1080p);
    sortTorrentsByPackage(sourceQuality.sources720p);
    sortTorrentsByPackage(sourceQuality.sourcesOther);

    let bestSource: StreamLinkSource = null;
    const bestSourceObss: Observable<StreamLinkSource | StreamLinkSource[]>[] = [];

    const allSources = sourceQuality.sources2160p.concat(sourceQuality.sources1080p, sourceQuality.sources720p, sourceQuality.sourcesOther);

    if (lastPlayedSource) {
      let maxScore = 0;
      let source: StreamLinkSource;
      streamLinkSources.forEach((d) => {
        const score = getScoreMatchingName(lastPlayedSource.title, d.title);
        if (score > maxScore) {
          source = d;
          maxScore = score;
        }
      });
      if (source) {
        allSources.unshift(source);
      }
    }

    let hasPmSource = false;
    let hasPmPremiumAccount = true;

    allSources.forEach((source) => {
      if (source.debridService === 'PM') {
        hasPmSource = true;
      }
      bestSourceObss.push(
        of(true).pipe(
          switchMap(() => {
            if (bestSource) {
              return of(bestSource);
            }

            if (source.debridService === 'PM' && !hasPmPremiumAccount) {
              // Don't check to avoid burning free account limit
              return of(null);
            }

            return this.getStreamLinks(source, sourceQuery).pipe(
              catchError((e) => {
                return of([]);
              }),
              map((streamLinks: StreamLink[]) => {
                if (streamLinks.length > 0) {
                  if (sourceQuery.episode && streamLinks.length > 1) {
                    const currentEpisodeFound = episodeFoundInStreamLinks(streamLinks, sourceQuery);

                    if (!currentEpisodeFound) {
                      return bestSource;
                    }
                  }
                  source.streamLinks = streamLinks;

                  bestSource = source;
                }

                return bestSource;
              })
            );
          })
        )
      );
    });

    let checkPmAccount = of(true);
    if (hasPmSource) {
      checkPmAccount = PremiumizeAccountInfoForm.submit().pipe(
        map((data) => {
          if (data.status === 'success' && data.premium_until === false) {
            hasPmPremiumAccount = false;
          }
          return hasPmPremiumAccount;
        })
      );
    }

    return checkPmAccount.pipe(
      switchMap(() => {
        return from(bestSourceObss).pipe(
          concatMap((result) => result),
          last(),
          map(() => {
            if (!bestSource && hasPmSource && !hasPmPremiumAccount && allSources.length > 0) {
              // Free PM account only, since PM sources are almost all reliable, let take the first one < 5gb
              allSources.forEach((source) => {
                if (!bestSource && source.size < 5 * 1024 * 1024 * 1024) {
                  bestSource = source;
                }
              });
            }

            return bestSource;
          })
        );
      })
    );
  }
}
