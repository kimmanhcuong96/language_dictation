import { describe, expect, it } from "vitest";
import { abortSpeechRecognition, classifyMicrophoneAccessError, classifySpeechRecognitionError, collectRecognizedSpeech, getSpeechRecognitionConstructor, getSpeechRecognitionLocale, mergeRecognizedSpeech, type BrowserSpeechRecognition, type BrowserSpeechRecognitionConstructor, type SpeechRecognitionErrorEventLike, type SpeechRecognitionEventLike, type SpeechRecognitionResultListLike } from "./speechRecognition";

describe("speech recognition helpers", () => {
  it("maps learning language identifiers to explicit BCP 47 locales", () => {
    expect(getSpeechRecognitionLocale("en")).toBe("en-US");
    expect(getSpeechRecognitionLocale("zh-CN")).toBe("zh-CN");
    expect(getSpeechRecognitionLocale("ja")).toBe("ja-JP");
    expect(getSpeechRecognitionLocale("fr")).toBeNull();
    expect(getSpeechRecognitionLocale(undefined)).toBeNull();
  });

  it("feature-detects the prefixed browser implementation", () => {
    class FakeRecognition implements BrowserSpeechRecognition {
      lang="";continuous=false;interimResults=false;maxAlternatives=1;
      onstart:((event:Event)=>void)|null=null;onresult:((event:SpeechRecognitionEventLike)=>void)|null=null;onerror:((event:SpeechRecognitionErrorEventLike)=>void)|null=null;onend:((event:Event)=>void)|null=null;
      start(){} stop(){} abort(){}
    }
    const speechWindow=window as Window&{SpeechRecognition?:BrowserSpeechRecognitionConstructor;webkitSpeechRecognition?:BrowserSpeechRecognitionConstructor},standard=speechWindow.SpeechRecognition,prefixed=speechWindow.webkitSpeechRecognition;
    try{speechWindow.SpeechRecognition=undefined;speechWindow.webkitSpeechRecognition=FakeRecognition;expect(getSpeechRecognitionConstructor()).toBe(FakeRecognition);}
    finally{speechWindow.SpeechRecognition=standard;speechWindow.webkitSpeechRecognition=prefixed;}
  });

  it("preserves existing answers and uses language-appropriate spacing", () => {
    expect(mergeRecognizedSpeech("I went", "home", "en")).toBe("I went home");
    expect(mergeRecognizedSpeech("今日は", "学校に行きます", "ja")).toBe("今日は学校に行きます");
    expect(mergeRecognizedSpeech("", "Hello", "en")).toBe("Hello");
  });

  it("collects interim and final recognition results", () => {
    const results = { 0: { 0: { transcript: "I went" }, length: 1, isFinal: true }, 1: { 0: { transcript: "home" }, length: 1, isFinal: false }, length: 2 } as SpeechRecognitionResultListLike;
    expect(collectRecognizedSpeech(results, "en")).toBe("I went home");
  });

  it("classifies common browser errors and ignores manual aborts", () => {
    expect(classifySpeechRecognitionError("not-allowed")).toBe("permission");
    expect(classifySpeechRecognitionError("no-speech")).toBe("noSpeech");
    expect(classifySpeechRecognitionError("audio-capture")).toBe("audioCapture");
    expect(classifySpeechRecognitionError("network")).toBe("network");
    expect(classifySpeechRecognitionError("language-not-supported")).toBe("languageUnsupported");
    expect(classifySpeechRecognitionError("aborted")).toBeNull();
  });

  it("distinguishes denied microphone access from missing capture devices", () => {
    expect(classifyMicrophoneAccessError(new DOMException("Blocked", "NotAllowedError"))).toBe("permission");
    expect(classifyMicrophoneAccessError(new DOMException("Missing", "NotFoundError"))).toBe("audioCapture");
    expect(classifyMicrophoneAccessError(new Error("Unexpected"))).toBe("unknown");
  });

  it("detaches callbacks and safely aborts an active instance", () => {
    let aborted = false;
    const recognition = {
      lang:"",continuous:false,interimResults:false,maxAlternatives:1,
      onstart:()=>undefined,onresult:()=>undefined,onerror:()=>undefined,onend:()=>undefined,
      start:()=>undefined,stop:()=>undefined,abort:()=>{aborted=true;},
    } as BrowserSpeechRecognition;
    abortSpeechRecognition(recognition);
    expect(aborted).toBe(true);
    expect(recognition.onstart).toBeNull();
    expect(recognition.onresult).toBeNull();
    expect(recognition.onerror).toBeNull();
    expect(recognition.onend).toBeNull();
  });
});
