import { KodiOpenMedia } from '../entities/kodi-open-media';
import { of } from 'rxjs';
import { getSourceQueryEpisode, getSourceQueryMovie } from '../services/tools';
import { catchError, map, switchMap } from 'rxjs/operators';
import { TmdbSeasonGetByIdForm } from '../services/tmdb/forms/seasons/tmdb-season-get-by-id.form';
import { TvdbEpisodeForm } from '../services/tvdb/forms/episodes/tvdb-episode.form';

export class SourceQueryFromKodiOpenMediaQuery {
  static getData(kodiOpenMedia: KodiOpenMedia) {
    if (!kodiOpenMedia) {
      return of(null);
    }
    if (kodiOpenMedia.movie) {
      return of(getSourceQueryMovie(kodiOpenMedia.movie));
    }

    const sourceQuery = getSourceQueryEpisode(kodiOpenMedia.show, kodiOpenMedia.episode);

    if (!kodiOpenMedia.show.ids.tmdb) {
      return of(sourceQuery);
    }
    return TmdbSeasonGetByIdForm.submit(kodiOpenMedia.show.ids.tmdb, kodiOpenMedia.episode.seasonNumber).pipe(
      catchError(() => {
        return of(null);
      }),
      map((tmdbSeason) => {
        if (!tmdbSeason) {
          return sourceQuery;
        }
        const today = new Date();
        tmdbSeason.episodes.forEach((episode) => {
          if (!sourceQuery.episode.absoluteNumber && episode.episode_number === kodiOpenMedia.episode.number) {
            sourceQuery.episode.absoluteNumber = episode.production_code;
          }

          const airDate = new Date(episode.air_date);
          if (airDate <= today) {
            sourceQuery.episode.latestAiredEpisode = episode.episode_number;
          }
        });

        return sourceQuery;
      }),
      switchMap((sourceQuery) => {
        if (sourceQuery.episode && sourceQuery.episode.tvdbId && sourceQuery.episode.isAnime && !sourceQuery.episode.absoluteNumber) {
          return TvdbEpisodeForm.submit(sourceQuery.episode.tvdbId).pipe(
            map((data) => {
              sourceQuery.episode.absoluteNumber = data.data.absoluteNumber;
              return sourceQuery;
            }),
            catchError((err) => {
              return of(sourceQuery);
            })
          );
        }

        return of(sourceQuery);
      })
    );
  }
}
