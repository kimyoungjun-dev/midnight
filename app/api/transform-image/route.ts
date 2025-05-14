import Replicate from "replicate";
import * as deepl from "deepl-node";
import { NextRequest, NextResponse } from "next/server";

// 1. Replicate API 토큰 설정
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 2. DeepL API 키 설정
const DEEPL_API_KEY = process.env.DEEPL_API_KEY!;
const translator = new deepl.Translator(DEEPL_API_KEY);

// 3. 한국어 프롬프트를 영어로 번역하는 함수
async function translateToEnglish(koreanText: string): Promise<string> {
  const result = await translator.translateText(koreanText, "ko", "en-US");
  return result.text;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const koreanPrompt = formData.get("prompt") as string | null;

    console.log("imageFile: ", imageFile)
    console.log("koreanPrompt: ", koreanPrompt)


    if (!imageFile) {
      return NextResponse.json(
        { error: "이미지 파일을 찾을 수 없습니다." },
        { status: 400 }
      );
    }

    if (!koreanPrompt) {
      return NextResponse.json(
        { error: "프롬프트를 찾을 수 없습니다." },
        { status: 400 }
      );
    }

    // 4. 한국어 프롬프트를 영어로 번역
    const englishPrompt = await translateToEnglish(koreanPrompt);

    console.log("englishPrompt: ", englishPrompt)

    // 이미지 파일을 base64로 변환하거나, Replicate가 직접 File 객체를 받을 수 있는지 확인 필요
    // 여기서는 Replicate SDK가 브라우저 환경과 유사하게 File 객체 또는 Buffer를 처리할 수 있다고 가정합니다.
    // Node.js 환경에서는 File 객체를 직접 보내기 어려우므로, Buffer로 변환 후 base64 문자열로 변환하는 것이 일반적입니다.
    // Replicate 라이브러리가 `fetch`를 내부적으로 사용하고 FormData를 지원한다면 File 객체를 바로 사용할 수도 있습니다.
    // 우선은 File 객체를 시도하고, 문제가 발생하면 Buffer/base64 방식으로 수정합니다.

    // File을 Buffer로 변환
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    // Buffer를 base64 문자열로 변환 (Data URL 형식)
    const imageBase64 = `data:${imageFile.type};base64,${imageBuffer.toString("base64")}`;


    // 5. Replicate 모델 실행 (ControlNet 기반)
    const rawOutputFromReplicate: any = await replicate.run(
      "zsxkib/step1x-edit:12b5a5a61e3419f792eb56cfc16eed046252740ebf5d470228f9b4cf2c861610",
      {
        input: {
          image: imageBase64, // base64로 인코딩된 이미지 데이터 사용
          prompt: englishPrompt,
          controlnet_conditioning_scale: 1.2,
          num_inference_steps: 30,
          guidance_scale: 8.5,
        },
      }
    );

    console.log("Raw output from replicate.run(): ", rawOutputFromReplicate);

    let processedOutput;

    // Check if rawOutputFromReplicate is a ReadableStream (Web API Stream)
    // if (rawOutputFromReplicate && typeof (rawOutputFromReplicate as any).getReader === 'function') {
      console.log("Output is a ReadableStream. Reading and parsing as JSON...");
      const stream = rawOutputFromReplicate as ReadableStream; // Type assertion
      const reader = stream.getReader();
      const decoder = new TextDecoder(); // Defaults to 'utf-8'
      let content = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }
      content += decoder.decode(); // Final flush

      try {
        processedOutput = JSON.parse(content);
        console.log("Parsed JSON from stream:", processedOutput);
      } catch (parseError) {
        console.error("Failed to parse stream content as JSON. Raw content snippet:", content.substring(0, 500));
        // Replicate is expected to return JSON. If parsing fails, it's an issue.
        throw new Error("Replicate stream content could not be parsed as JSON.");
      }
    // } else {
    //   // If not a stream, assume it's the direct output
    //   console.log("Output is not a stream. Using directly:", rawOutputFromReplicate);
    //   processedOutput = rawOutputFromReplicate;
    // }

    // 6. 결과 반환
    // The client page.tsx expects something like { diaryText: "...", transformedImageUrl: "..." }
    // For now, we return the direct processedOutput from Replicate wrapped in an "output" key.
    // Further adaptation might be needed based on what processedOutput contains.
    console.log("Returning processed output to client:", processedOutput);
    return NextResponse.json({ output: processedOutput });
  } catch (error) {
    console.error("Error processing image:", error);
    if (error instanceof deepl.DeepLError) {
      return NextResponse.json(
        { error: `DeepL 번역 오류: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "이미지 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
