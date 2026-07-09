import { Layer } from 'effect';
import { ClockServiceLive } from '~/shared/clock/service';
import { CsvParserLive } from '~/shared/csv/service';
import { PdfServiceLive } from '~/shared/pdf/service';
import { ZipServiceLive } from '~/shared/zip/service';

export const LiveWorkerLayer = Layer.mergeAll(CsvParserLive, PdfServiceLive, ZipServiceLive, ClockServiceLive);
