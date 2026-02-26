export interface PronunciationScore {
  accuracy: number; // 0-100: Độ chính xác từ
  duration: number; // 0-100: Trường âm (dài/ngắn)
  rhythm: number; // 0-100: Nhịp điệu, ngắt câu
  fluency: number; // 0-100: Độ trôi chảy
  overall: number; // 0-100: Điểm tổng
  feedback: PronunciationFeedback[];
  highlightedText?: HighlightedWord[];
}

export interface PronunciationFeedback {
  type: 'success' | 'warning' | 'error';
  category: 'accuracy' | 'duration' | 'rhythm' | 'fluency';
  message: string;
  suggestion?: string;
}

export interface HighlightedWord {
  word: string;
  status: 'correct' | 'incorrect' | 'missing' | 'extra';
  expected?: string;
}

// Helper function to analyze pronunciation
export const analyzePronunciation = (
  targetText: string,
  userTranscript: string
): PronunciationScore => {
  const normalizeText = (text: string) => 
    text.trim().toLowerCase().replace(/\s+/g, '').replace(/[。、！？]/g, '');

  const target = normalizeText(targetText);
  const user = normalizeText(userTranscript);

  // Calculate accuracy based on character matching
  let matches = 0;
  const maxLen = Math.max(target.length, user.length);
  const minLen = Math.min(target.length, user.length);

  for (let i = 0; i < minLen; i++) {
    if (target[i] === user[i]) matches++;
  }

  const accuracy = maxLen > 0 ? Math.round((matches / maxLen) * 100) : 0;

  // Duration score based on length difference
  const lengthRatio = user.length / (target.length || 1);
  const duration = Math.round(Math.max(0, 100 - Math.abs(1 - lengthRatio) * 100));

  // Rhythm: simplified - based on pause patterns (mock for now)
  const rhythm = Math.round(70 + Math.random() * 30);

  // Fluency: based on completeness and accuracy
  const fluency = Math.round((accuracy * 0.6 + duration * 0.4));

  // Overall weighted score
  const overall = Math.round(
    accuracy * 0.4 + duration * 0.2 + rhythm * 0.2 + fluency * 0.2
  );

  // Generate feedback
  const feedback: PronunciationFeedback[] = [];

  if (accuracy >= 90) {
    feedback.push({
      type: 'success',
      category: 'accuracy',
      message: 'Phát âm rất chính xác!',
    });
  } else if (accuracy >= 70) {
    feedback.push({
      type: 'warning',
      category: 'accuracy',
      message: 'Một số từ chưa chính xác',
      suggestion: 'Hãy nghe lại mẫu và luyện tập từng từ riêng lẻ',
    });
  } else {
    feedback.push({
      type: 'error',
      category: 'accuracy',
      message: 'Cần cải thiện độ chính xác',
      suggestion: 'Thử nói chậm hơn và rõ ràng từng từ',
    });
  }

  if (duration < 70) {
    feedback.push({
      type: 'warning',
      category: 'duration',
      message: lengthRatio < 1 ? 'Bạn nói hơi ngắn' : 'Bạn nói hơi dài',
      suggestion: 'Chú ý độ dài của các âm như ー, っ',
    });
  }

  if (fluency >= 80) {
    feedback.push({
      type: 'success',
      category: 'fluency',
      message: 'Nói trôi chảy tự nhiên!',
    });
  }

  // Generate highlighted text
  const highlightedText: HighlightedWord[] = [];

  const normalTarget = normalizeText(targetText);
  const normalUser = normalizeText(userTranscript);

  let ti = 0, ui = 0;
  while (ti < normalTarget.length || ui < normalUser.length) {
    if (ti < normalTarget.length && ui < normalUser.length) {
      if (normalTarget[ti] === normalUser[ui]) {
        highlightedText.push({ word: normalUser[ui], status: 'correct' });
        ti++;
        ui++;
      } else {
        highlightedText.push({ 
          word: normalUser[ui], 
          status: 'incorrect',
          expected: normalTarget[ti]
        });
        ti++;
        ui++;
      }
    } else if (ui < normalUser.length) {
      highlightedText.push({ word: normalUser[ui], status: 'extra' });
      ui++;
    } else {
      highlightedText.push({ word: normalTarget[ti], status: 'missing' });
      ti++;
    }
  }

  return {
    accuracy,
    duration,
    rhythm,
    fluency,
    overall,
    feedback,
    highlightedText,
  };
};
