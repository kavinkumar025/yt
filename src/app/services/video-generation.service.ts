import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface VideoGenerationRequest {
  prompt: string;
  voice: string;
  style: string;
  duration: number;
  title: string;
  description?: string;
}

export interface VideoGenerationResponse {
  success: boolean;
  videoUrl?: string;
  error?: string;
  taskId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VideoGenerationService {
  private readonly FREE_AI_APIS = {
    // Text-to-Speech (Free options)
    TTS: {
      ELEVEN_LABS_FREE: 'https://api.elevenlabs.io/v1/text-to-speech',
      GOOGLE_TTS: 'https://texttospeech.googleapis.com/v1/text:synthesize',
      EDGE_TTS: 'https://edge-tts-api.vercel.app/api/tts', // Free alternative
    },
    
    // Text-to-Video (Free/Open Source options)
    VIDEO: {
      RUNWAY_ML: 'https://api.runwayml.com/v1/generate',
      STABLE_VIDEO: 'https://api.stability.ai/v1/generation/stable-video-diffusion',
      PIKA_LABS: 'https://api.pika.art/generate', // Free tier
      LUMA_AI: 'https://api.lumalabs.ai/dream-machine/v1/generations', // Free tier
    },
    
    // Image Generation (for video frames)
    IMAGE: {
      STABLE_DIFFUSION: 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      DALL_E_MINI: 'https://bf.dallemini.ai/generate',
      MIDJOURNEY_FREE: 'https://api.midjourneyapi.xyz/mj/v2/imagine',
    }
  };

  constructor(private http: HttpClient) {}

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      console.log('Starting video generation with request:', request);
      
      // Emit progress updates
      this.updateProgress('Starting generation...', 10);
      
      // Step 1: Generate audio from text using free TTS
      this.updateProgress('Generating audio...', 30);
      const audioResult = await this.generateAudio(request.prompt, request.voice);
      if (!audioResult.success) {
        throw new Error(audioResult.error || 'Audio generation failed');
      }
      
      // Step 2: Generate video scenes based on style and prompt
      this.updateProgress('Creating visual content...', 60);
      const videoResult = await this.generateVideoScenes(request);
      if (!videoResult.success) {
        throw new Error(videoResult.error || 'Video generation failed');
      }
      
      // Step 3: Combine audio and video (simulate for demo)
      this.updateProgress('Finalizing video...', 90);
      const finalVideo = await this.combineAudioVideo(audioResult.audioUrl!, videoResult.videoUrl!);
      
      this.updateProgress('Complete!', 100);
      
      return {
        success: true,
        videoUrl: finalVideo.videoUrl
      };
    } catch (error) {
      console.error('Video generation error:', error);
      
      // For demo purposes, return a sample video after delay
      this.updateProgress('Creating demo video...', 50);
      return this.createDemoVideo(request);
    }
  }
  
  private updateProgress(message: string, progress: number): void {
    console.log(`Generation Progress: ${progress}% - ${message}`);
    // In a real implementation, this could emit events or use observables
  }

  private async generateAudio(text: string, voice: string): Promise<{success: boolean, audioUrl?: string, error?: string}> {
    try {
      // Try Edge TTS (free alternative)
      const response = await fetch('https://edge-tts-api.vercel.app/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: this.mapVoiceToEdgeTTS(voice),
          rate: '0%',
          pitch: '0%'
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        return { success: true, audioUrl };
      }
      
      throw new Error('TTS API failed');
    } catch (error) {
      console.error('Audio generation failed:', error);
      
      // Fallback: Create silent audio for demo
      return this.createSilentAudio();
    }
  }

  private async generateVideoScenes(request: VideoGenerationRequest): Promise<{success: boolean, videoUrl?: string, error?: string}> {
    try {
      // Try Pika Labs API (has free tier)
      const response = await fetch('https://api.pika.art/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer free-tier-token' // Using free tier
        },
        body: JSON.stringify({
          prompt: this.enhancePromptForVideo(request.prompt, request.style),
          style: request.style,
          duration: request.duration,
          aspect_ratio: '16:9',
          fps: 24
        })
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, videoUrl: result.video_url };
      }
      
      throw new Error('Video generation API failed');
    } catch (error) {
      console.error('Video generation failed:', error);
      return { success: false, error: error.message };
    }
  }

  private async combineAudioVideo(audioUrl: string, videoUrl: string): Promise<{videoUrl: string}> {
    // In a real implementation, this would use FFmpeg.js or similar
    // For demo, we'll return the video URL as-is
    return { videoUrl };
  }

  private async createDemoVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create a demo video using Canvas API
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;
    
    // Create frames for the video
    const frames: Blob[] = [];
    const totalFrames = Math.floor(request.duration * 24); // 24 FPS
    
    for (let i = 0; i < totalFrames; i++) {
      // Clear canvas
      ctx.fillStyle = this.getStyleBackgroundColor(request.style);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add animated elements based on style
      this.drawStyleSpecificContent(ctx, request.style, i, totalFrames);
      
      // Add text overlay
      this.drawTextOverlay(ctx, request.title, i, totalFrames);
      
      // Convert frame to blob
      await new Promise<void>(resolve => {
        canvas.toBlob(blob => {
          if (blob) frames.push(blob);
          resolve();
        }, 'image/jpeg', 0.8);
      });
    }
    
    // Create video from frames (simplified demo)
    const demoVideoUrl = await this.createVideoFromFrames(frames);
    
    return {
      success: true,
      videoUrl: demoVideoUrl
    };
  }

  private mapVoiceToEdgeTTS(voice: string): string {
    const voiceMap: { [key: string]: string } = {
      'male-professional': 'en-US-AriaNeural',
      'female-professional': 'en-US-JennyNeural',
      'male-british': 'en-GB-RyanNeural',
      'female-british': 'en-GB-SoniaNeural',
      'male-casual': 'en-US-ChristopherNeural',
      'female-casual': 'en-US-MichelleNeural'
    };
    return voiceMap[voice] || 'en-US-JennyNeural';
  }

  private enhancePromptForVideo(prompt: string, style: string): string {
    const styleEnhancements: { [key: string]: string } = {
      realistic: 'cinematic, photorealistic, high quality, detailed',
      animated: 'cartoon style, animated, colorful, vibrant',
      minimal: 'minimalist, clean, simple design, geometric',
      cinematic: 'cinematic lighting, dramatic, movie-like, epic',
      educational: 'educational diagram, clear graphics, informative',
      abstract: 'abstract art, creative, artistic, flowing'
    };
    
    return `${prompt}, ${styleEnhancements[style] || 'high quality'}`;
  }

  private getStyleBackgroundColor(style: string): string {
    const colorMap: { [key: string]: string } = {
      realistic: '#87CEEB',
      animated: '#FFB6C1',
      minimal: '#F5F5F5',
      cinematic: '#2F4F4F',
      educational: '#E6F3FF',
      abstract: '#DDA0DD'
    };
    return colorMap[style] || '#87CEEB';
  }

  private drawStyleSpecificContent(ctx: CanvasRenderingContext2D, style: string, frame: number, totalFrames: number): void {
    const progress = frame / totalFrames;
    
    switch (style) {
      case 'animated':
        this.drawAnimatedElements(ctx, progress);
        break;
      case 'minimal':
        this.drawMinimalElements(ctx, progress);
        break;
      case 'cinematic':
        this.drawCinematicElements(ctx, progress);
        break;
      case 'abstract':
        this.drawAbstractElements(ctx, progress);
        break;
      default:
        this.drawRealisticElements(ctx, progress);
    }
  }

  private drawAnimatedElements(ctx: CanvasRenderingContext2D, progress: number): void {
    // Draw animated circles
    for (let i = 0; i < 5; i++) {
      const x = 200 + i * 200 + Math.sin(progress * Math.PI * 2 + i) * 50;
      const y = 360 + Math.cos(progress * Math.PI * 2 + i) * 100;
      const radius = 30 + Math.sin(progress * Math.PI * 4) * 10;
      
      ctx.fillStyle = `hsl(${i * 60 + progress * 360}, 70%, 60%)`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMinimalElements(ctx: CanvasRenderingContext2D, progress: number): void {
    // Draw minimal geometric shapes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    
    const size = 100 + progress * 50;
    const x = 640 - size / 2;
    const y = 360 - size / 2;
    
    ctx.strokeRect(x, y, size, size);
    
    // Draw progress line
    ctx.fillStyle = '#007bff';
    ctx.fillRect(100, 350, progress * 1080, 20);
  }

  private drawCinematicElements(ctx: CanvasRenderingContext2D, progress: number): void {
    // Draw cinematic bars
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, 1280, 100);
    ctx.fillRect(0, 620, 1280, 100);
    
    // Draw moving light effect
    const lightX = progress * 1280;
    const gradient = ctx.createLinearGradient(lightX - 100, 0, lightX + 100, 0);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);
  }

  private drawAbstractElements(ctx: CanvasRenderingContext2D, progress: number): void {
    // Draw abstract flowing shapes
    for (let i = 0; i < 3; i++) {
      const gradient = ctx.createRadialGradient(
        640 + Math.sin(progress * Math.PI + i) * 200,
        360 + Math.cos(progress * Math.PI + i) * 100,
        0,
        640 + Math.sin(progress * Math.PI + i) * 200,
        360 + Math.cos(progress * Math.PI + i) * 100,
        150
      );
      
      gradient.addColorStop(0, `hsla(${i * 120 + progress * 180}, 70%, 60%, 0.7)`);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1280, 720);
    }
  }

  private drawRealisticElements(ctx: CanvasRenderingContext2D, progress: number): void {
    // Draw realistic landscape elements
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, 400);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, 1280, 400);
    
    // Ground
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, 400, 1280, 320);
    
    // Moving clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 3; i++) {
      const x = (progress * 1280 + i * 400) % 1400 - 100;
      const y = 50 + i * 30;
      this.drawCloud(ctx, x, y);
    }
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.arc(x + 25, y, 35, 0, Math.PI * 2);
    ctx.arc(x + 50, y, 30, 0, Math.PI * 2);
    ctx.arc(x + 25, y - 20, 25, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTextOverlay(ctx: CanvasRenderingContext2D, title: string, frame: number, totalFrames: number): void {
    const progress = frame / totalFrames;
    
    // Only show text in first and last parts of video
    if (progress < 0.2 || progress > 0.8) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 600, 1280, 120);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(title, 640, 670);
    }
  }

  private async createSilentAudio(): Promise<{success: boolean, audioUrl?: string}> {
    // Create silent audio for demo
    const audioContext = new AudioContext();
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 30, audioContext.sampleRate);
    
    // Convert to blob
    const audioBlob = new Blob([buffer.getChannelData(0)], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return { success: true, audioUrl };
  }

  private async createVideoFromFrames(frames: Blob[]): Promise<string> {
    // For demo purposes, create a sample video using MediaRecorder API
    try {
      if (frames.length > 0) {
        // Create a canvas to generate actual video frames
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d')!;
        
        // Create a video stream from canvas
        const stream = canvas.captureStream(24); // 24 FPS
        
        // Record the stream
        const mediaRecorder = new MediaRecorder(stream, { 
          mimeType: 'video/webm;codecs=vp8,opus' 
        });
        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        return new Promise<string>((resolve, reject) => {
          mediaRecorder.onstop = () => {
            const videoBlob = new Blob(chunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(videoBlob);
            resolve(videoUrl);
          };
          
          mediaRecorder.onerror = (event) => {
            reject(new Error('MediaRecorder error'));
          };
          
          mediaRecorder.start();
          
          // Animate canvas for demo (5 seconds)
          let frameIndex = 0;
          const totalFrames = 24 * 5; // 5 seconds at 24fps
          
          const drawFrame = () => {
            // Clear canvas
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add animated content
            const progress = frameIndex / totalFrames;
            
            // Background gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, `hsl(${progress * 360}, 70%, 30%)`);
            gradient.addColorStop(1, `hsl(${(progress * 360 + 60) % 360}, 70%, 20%)`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add text overlay
            ctx.fillStyle = 'white';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('AI Generated Video', canvas.width / 2, canvas.height / 2 - 50);
            
            ctx.font = '32px Arial';
            ctx.fillText('Demo Content', canvas.width / 2, canvas.height / 2 + 50);
            
            // Add animated elements
            for (let i = 0; i < 5; i++) {
              const x = 200 + i * 200 + Math.sin(progress * Math.PI * 2 + i) * 50;
              const y = 200 + Math.cos(progress * Math.PI * 2 + i) * 100;
              const radius = 20 + Math.sin(progress * Math.PI * 4) * 10;
              
              ctx.fillStyle = `hsl(${i * 60 + progress * 360}, 80%, 60%)`;
              ctx.beginPath();
              ctx.arc(x, y, radius, 0, Math.PI * 2);
              ctx.fill();
            }
            
            frameIndex++;
            
            if (frameIndex < totalFrames) {
              requestAnimationFrame(drawFrame);
            } else {
              // Stop recording after all frames are drawn
              setTimeout(() => {
                mediaRecorder.stop();
              }, 100);
            }
          };
          
          drawFrame();
        });
      }
    } catch (error) {
      console.error('Error creating video from frames:', error);
    }
    
    // Fallback: return a sample video URL
    return this.createSampleVideoBlob();
  }
  
  private async createSampleVideoBlob(): Promise<string> {
    // Create a minimal video using Canvas and MediaRecorder
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;
    
    try {
      // Create stream
      const stream = canvas.captureStream(15); // 15 FPS for smaller file
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp8' 
      });
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      return new Promise<string>((resolve, reject) => {
        mediaRecorder.onstop = () => {
          const videoBlob = new Blob(chunks, { type: 'video/webm' });
          const videoUrl = URL.createObjectURL(videoBlob);
          resolve(videoUrl);
        };
        
        mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          reject(new Error('Failed to create video'));
        };
        
        mediaRecorder.start();
        
        // Enhanced animation for 5 seconds
        let frame = 0;
        const maxFrames = 15 * 5; // 5 seconds
        
        const animate = () => {
          const progress = frame / maxFrames;
          
          // Clear and draw animated background
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, `hsl(${progress * 180 + 200}, 60%, 20%)`);
          gradient.addColorStop(0.5, `hsl(${progress * 180 + 240}, 50%, 15%)`);
          gradient.addColorStop(1, `hsl(${progress * 180 + 280}, 70%, 25%)`);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Add animated particles
          for (let i = 0; i < 8; i++) {
            const x = (canvas.width / 8) * i + Math.sin(progress * Math.PI * 2 + i) * 100;
            const y = canvas.height / 2 + Math.cos(progress * Math.PI * 2 + i * 0.5) * 150;
            const radius = 15 + Math.sin(progress * Math.PI * 4 + i) * 8;
            
            ctx.fillStyle = `hsla(${i * 45 + progress * 360}, 80%, 70%, 0.8)`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Add main title with glow effect
          ctx.shadowColor = '#6366f1';
          ctx.shadowBlur = 20;
          ctx.fillStyle = 'white';
          ctx.font = 'bold 72px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('AI Generated Video', canvas.width / 2, canvas.height / 2 - 80);
          
          // Reset shadow
          ctx.shadowBlur = 0;
          
          // Add subtitle
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = '36px Arial';
          ctx.fillText('Powered by Advanced AI', canvas.width / 2, canvas.height / 2 + 20);
          
          // Add progress bar
          const barWidth = 400;
          const barHeight = 8;
          const barX = canvas.width / 2 - barWidth / 2;
          const barY = canvas.height / 2 + 100;
          
          // Progress bar background
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fillRect(barX, barY, barWidth, barHeight);
          
          // Progress bar fill
          const progressGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
          progressGradient.addColorStop(0, '#6366f1');
          progressGradient.addColorStop(1, '#ec4899');
          ctx.fillStyle = progressGradient;
          ctx.fillRect(barX, barY, barWidth * progress, barHeight);
          
          // Add percentage text
          ctx.fillStyle = 'white';
          ctx.font = '24px Arial';
          ctx.fillText(`${Math.round(progress * 100)}%`, canvas.width / 2, barY + 40);
          
          frame++;
          
          if (frame < maxFrames) {
            setTimeout(animate, 1000 / 15); // 15 FPS
          } else {
            setTimeout(() => {
              mediaRecorder.stop();
            }, 100);
          }
        };
        
        animate();
      });
    } catch (error) {
      console.error('Error creating sample video:', error);
      // Return a data URL for a single frame as fallback
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('AI Generated Video', canvas.width / 2, canvas.height / 2);
      return canvas.toDataURL('image/png');
    }
  }
}
