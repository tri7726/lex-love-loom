import { Injectable } from '@nestjs/common';
import { AnalyzeSpeechDto } from './dto/analyze.dto';

@Injectable()
export class SpeakingService {
  /**
   * Character-level diff scoring scaffold.
   * TODO (Tuần 4): port full logic from supabase/functions/analyze-speech.
   */
  analyze(dto: AnalyzeSpeechDto) {
    const ref = dto.reference.replace(/\s/g, '');
    const hyp = dto.transcript.replace(/\s/g, '');
    const total = ref.length || 1;
    let correct = 0;
    for (let i = 0; i < Math.min(ref.length, hyp.length); i++) {
      if (ref[i] === hyp[i]) correct++;
    }
    const accuracy = Math.round((correct / total) * 100);
    const grade =
      accuracy >= 95 ? 'S' : accuracy >= 85 ? 'A' : accuracy >= 70 ? 'B' : accuracy >= 50 ? 'C' : 'D';
    return { accuracy, grade, ref, hyp, correct, total };
  }
}
