-- Create reading_passages table
CREATE TABLE public.reading_passages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_with_furigana TEXT,
  level TEXT NOT NULL DEFAULT 'N5',
  category TEXT,
  vocabulary_list JSONB DEFAULT '[]'::jsonb,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reading_passages ENABLE ROW LEVEL SECURITY;

-- Policies for reading_passages
CREATE POLICY "Anyone can view reading passages"
ON public.reading_passages
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create passages"
ON public.reading_passages
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own passages"
ON public.reading_passages
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own passages"
ON public.reading_passages
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_reading_passages_updated_at
BEFORE UPDATE ON public.reading_passages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample passages
INSERT INTO public.reading_passages (title, content, content_with_furigana, level, category, vocabulary_list) VALUES
(
  '私の一日',
  '私は毎朝六時に起きます。朝ご飯を食べて、学校に行きます。学校で日本語を勉強します。午後三時に家に帰ります。',
  '<ruby>私<rt>わたし</rt></ruby>は<ruby>毎朝<rt>まいあさ</rt></ruby><ruby>六時<rt>ろくじ</rt></ruby>に<ruby>起<rt>お</rt></ruby>きます。<ruby>朝<rt>あさ</rt></ruby>ご<ruby>飯<rt>はん</rt></ruby>を<ruby>食<rt>た</rt></ruby>べて、<ruby>学校<rt>がっこう</rt></ruby>に<ruby>行<rt>い</rt></ruby>きます。<ruby>学校<rt>がっこう</rt></ruby>で<ruby>日本語<rt>にほんご</rt></ruby>を<ruby>勉強<rt>べんきょう</rt></ruby>します。<ruby>午後<rt>ごご</rt></ruby><ruby>三時<rt>さんじ</rt></ruby>に<ruby>家<rt>いえ</rt></ruby>に<ruby>帰<rt>かえ</rt></ruby>ります。',
  'N5',
  'Cuộc sống hàng ngày',
  '[{"word": "毎朝", "reading": "まいあさ", "meaning": "mỗi sáng"}, {"word": "起きる", "reading": "おきる", "meaning": "thức dậy"}, {"word": "朝ご飯", "reading": "あさごはん", "meaning": "bữa sáng"}, {"word": "学校", "reading": "がっこう", "meaning": "trường học"}, {"word": "勉強", "reading": "べんきょう", "meaning": "học tập"}]'::jsonb
),
(
  '私の家族',
  '私の家族は四人です。父と母と姉と私です。父は会社員です。母は先生です。姉は大学生です。私たちは毎日一緒に晩ご飯を食べます。',
  '<ruby>私<rt>わたし</rt></ruby>の<ruby>家族<rt>かぞく</rt></ruby>は<ruby>四人<rt>よにん</rt></ruby>です。<ruby>父<rt>ちち</rt></ruby>と<ruby>母<rt>はは</rt></ruby>と<ruby>姉<rt>あね</rt></ruby>と<ruby>私<rt>わたし</rt></ruby>です。<ruby>父<rt>ちち</rt></ruby>は<ruby>会社員<rt>かいしゃいん</rt></ruby>です。<ruby>母<rt>はは</rt></ruby>は<ruby>先生<rt>せんせい</rt></ruby>です。<ruby>姉<rt>あね</rt></ruby>は<ruby>大学生<rt>だいがくせい</rt></ruby>です。<ruby>私<rt>わたし</rt></ruby>たちは<ruby>毎日<rt>まいにち</rt></ruby><ruby>一緒<rt>いっしょ</rt></ruby>に<ruby>晩<rt>ばん</rt></ruby>ご<ruby>飯<rt>はん</rt></ruby>を<ruby>食<rt>た</rt></ruby>べます。',
  'N5',
  'Gia đình',
  '[{"word": "家族", "reading": "かぞく", "meaning": "gia đình"}, {"word": "父", "reading": "ちち", "meaning": "bố"}, {"word": "母", "reading": "はは", "meaning": "mẹ"}, {"word": "会社員", "reading": "かいしゃいん", "meaning": "nhân viên công ty"}, {"word": "大学生", "reading": "だいがくせい", "meaning": "sinh viên đại học"}]'::jsonb
),
(
  '日本の季節',
  '日本には四つの季節があります。春は桜が咲きます。夏は暑くて、海に行きます。秋は紅葉がきれいです。冬は雪が降ります。私は秋が一番好きです。',
  '<ruby>日本<rt>にほん</rt></ruby>には<ruby>四<rt>よっ</rt></ruby>つの<ruby>季節<rt>きせつ</rt></ruby>があります。<ruby>春<rt>はる</rt></ruby>は<ruby>桜<rt>さくら</rt></ruby>が<ruby>咲<rt>さ</rt></ruby>きます。<ruby>夏<rt>なつ</rt></ruby>は<ruby>暑<rt>あつ</rt></ruby>くて、<ruby>海<rt>うみ</rt></ruby>に<ruby>行<rt>い</rt></ruby>きます。<ruby>秋<rt>あき</rt></ruby>は<ruby>紅葉<rt>こうよう</rt></ruby>がきれいです。<ruby>冬<rt>ふゆ</rt></ruby>は<ruby>雪<rt>ゆき</rt></ruby>が<ruby>降<rt>ふ</rt></ruby>ります。<ruby>私<rt>わたし</rt></ruby>は<ruby>秋<rt>あき</rt></ruby>が<ruby>一番<rt>いちばん</rt></ruby><ruby>好<rt>す</rt></ruby>きです。',
  'N5',
  'Thiên nhiên',
  '[{"word": "季節", "reading": "きせつ", "meaning": "mùa"}, {"word": "桜", "reading": "さくら", "meaning": "hoa anh đào"}, {"word": "紅葉", "reading": "こうよう", "meaning": "lá đỏ mùa thu"}, {"word": "雪", "reading": "ゆき", "meaning": "tuyết"}, {"word": "一番", "reading": "いちばん", "meaning": "nhất, số một"}]'::jsonb
),
(
  '東京旅行',
  '先週、私は東京に旅行しました。渋谷で買い物をして、浅草で写真を撮りました。東京タワーからの景色はとてもきれいでした。また行きたいです。',
  '<ruby>先週<rt>せんしゅう</rt></ruby>、<ruby>私<rt>わたし</rt></ruby>は<ruby>東京<rt>とうきょう</rt></ruby>に<ruby>旅行<rt>りょこう</rt></ruby>しました。<ruby>渋谷<rt>しぶや</rt></ruby>で<ruby>買<rt>か</rt></ruby>い<ruby>物<rt>もの</rt></ruby>をして、<ruby>浅草<rt>あさくさ</rt></ruby>で<ruby>写真<rt>しゃしん</rt></ruby>を<ruby>撮<rt>と</rt></ruby>りました。<ruby>東京<rt>とうきょう</rt></ruby>タワーからの<ruby>景色<rt>けしき</rt></ruby>はとてもきれいでした。また<ruby>行<rt>い</rt></ruby>きたいです。',
  'N4',
  'Du lịch',
  '[{"word": "旅行", "reading": "りょこう", "meaning": "du lịch"}, {"word": "買い物", "reading": "かいもの", "meaning": "mua sắm"}, {"word": "写真", "reading": "しゃしん", "meaning": "ảnh"}, {"word": "景色", "reading": "けしき", "meaning": "phong cảnh"}, {"word": "撮る", "reading": "とる", "meaning": "chụp ảnh"}]'::jsonb
);