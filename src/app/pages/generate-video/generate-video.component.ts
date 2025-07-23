import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VideoGenerationService, VideoGenerationRequest } from '../../services/video-generation.service';

interface GenerationStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

@Component({
  selector: 'app-generate-video',
  templateUrl: './generate-video.component.html',
  styleUrls: ['./generate-video.component.scss']
})
export class GenerateVideoComponent implements OnInit, OnDestroy {
  generateForm: FormGroup;
  isGenerating = false;
  generationProgress = 0;
  generatedVideoUrl: string | null = null;
  estimatedTime = '2-3 minutes';
  isPlayingVoice: string | null = null;
  
  generationSteps: GenerationStep[] = [
    { step: 1, title: 'Processing Text', description: 'Analyzing your prompt and generating script', completed: false, active: false },
    { step: 2, title: 'Voice Synthesis', description: 'Converting text to natural speech', completed: false, active: false },
    { step: 3, title: 'Scene Generation', description: 'Creating visual scenes using AI', completed: false, active: false },
    { step: 4, title: 'Video Compilation', description: 'Combining audio and visuals', completed: false, active: false },
    { step: 5, title: 'Final Processing', description: 'Optimizing and finalizing video', completed: false, active: false }
  ];
  
  voiceOptions = [
    { value: 'male-professional', label: 'Professional Male', accent: 'American' },
    { value: 'female-professional', label: 'Professional Female', accent: 'American' },
    { value: 'male-british', label: 'British Male', accent: 'British' },
    { value: 'female-british', label: 'British Female', accent: 'British' },
    { value: 'male-casual', label: 'Casual Male', accent: 'American' },
    { value: 'female-casual', label: 'Casual Female', accent: 'American' }
  ];
  
  videoStyles = [
    { value: 'realistic', label: 'Realistic', description: 'Photo-realistic scenes and environments' },
    { value: 'animated', label: 'Animated', description: 'Cartoon-style animation' },
    { value: 'minimal', label: 'Minimal', description: 'Clean, simple graphics' },
    { value: 'cinematic', label: 'Cinematic', description: 'Movie-like dramatic scenes' },
    { value: 'educational', label: 'Educational', description: 'Diagram and presentation style' },
    { value: 'abstract', label: 'Abstract', description: 'Artistic and creative visuals' }
  ];
  
  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private videoGenService: VideoGenerationService
  ) {
    this.generateForm = this.fb.group({
      prompt: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      voice: ['female-professional', Validators.required],
      style: ['realistic', Validators.required],
      duration: [30, [Validators.required, Validators.min(15), Validators.max(300)]],
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)]
    });
  }
  
  ngOnInit(): void {
    // Initialize component
  }
  
  ngOnDestroy(): void {
    // Clean up video URL to prevent memory leaks
    this.cleanupVideoUrl();
  }
  
  async generateVideo(): Promise<void> {
    if (this.generateForm.invalid) {
      this.snackBar.open('Please fill in all required fields correctly', 'Close', { duration: 3000 });
      return;
    }
    
    this.isGenerating = true;
    this.generationProgress = 0;
    
    // Clean up any existing video URL
    this.cleanupVideoUrl();
    this.generatedVideoUrl = null;
    
    const formData = this.generateForm.value;
    
    try {
      // Start generation process
      this.startProgressSimulation();
      
      const result = await this.videoGenService.generateVideo({
        prompt: formData.prompt,
        voice: formData.voice,
        style: formData.style,
        duration: formData.duration,
        title: formData.title,
        description: formData.description
      });
      
      if (result.success) {
        this.generatedVideoUrl = result.videoUrl;
        
        // Small delay to ensure video element is ready
        setTimeout(() => {
          this.loadVideoPreview();
        }, 100);
        
        this.snackBar.open('Video generated successfully!', 'Close', { duration: 5000 });
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Video generation failed:', error);
      this.snackBar.open('Failed to generate video. Please try again.', 'Close', { duration: 5000 });
    } finally {
      this.isGenerating = false;
      this.resetGenerationSteps();
    }
  }
  
  private loadVideoPreview(): void {
    // Find the video element and load the generated video
    const videoElement = document.querySelector('.generated-video') as HTMLVideoElement;
    if (videoElement && this.generatedVideoUrl) {
      videoElement.load();
      
      // Add event listeners for better UX
      videoElement.addEventListener('loadeddata', () => {
        console.log('Video loaded successfully');
      });
      
      videoElement.addEventListener('error', (error) => {
        console.error('Error loading video:', error);
        this.snackBar.open('Error loading video preview', 'Close', { duration: 3000 });
      });
    }
  }
  
  private cleanupVideoUrl(): void {
    // Clean up any existing video URL to prevent memory leaks
    if (this.generatedVideoUrl) {
      URL.revokeObjectURL(this.generatedVideoUrl);
      this.generatedVideoUrl = null;
    }
  }
  
  private startProgressSimulation(): void {
    let currentStep = 0;
    const stepDuration = 30000; // 30 seconds per step
    
    const updateProgress = () => {
      if (currentStep < this.generationSteps.length && this.isGenerating) {
        // Complete previous step
        if (currentStep > 0) {
          this.generationSteps[currentStep - 1].completed = true;
          this.generationSteps[currentStep - 1].active = false;
        }
        
        // Activate current step
        this.generationSteps[currentStep].active = true;
        
        // Update progress
        this.generationProgress = ((currentStep + 1) / this.generationSteps.length) * 100;
        
        currentStep++;
        
        if (currentStep < this.generationSteps.length) {
          setTimeout(updateProgress, stepDuration);
        } else {
          // Complete final step
          this.generationSteps[currentStep - 1].completed = true;
          this.generationSteps[currentStep - 1].active = false;
          this.generationProgress = 100;
        }
      }
    };
    
    updateProgress();
  }
  
  private resetGenerationSteps(): void {
    this.generationSteps.forEach(step => {
      step.completed = false;
      step.active = false;
    });
  }
  
  onPromptExample(example: string): void {
    this.generateForm.patchValue({ prompt: example });
  }
  
  downloadVideo(): void {
    if (this.generatedVideoUrl) {
      const link = document.createElement('a');
      link.href = this.generatedVideoUrl;
      link.download = `generated-video-${Date.now()}.mp4`;
      link.click();
    }
  }
  
  shareVideo(): void {
    if (this.generatedVideoUrl && navigator.share) {
      navigator.share({
        title: this.generateForm.value.title || 'Generated Video',
        text: this.generateForm.value.description || 'Check out this AI-generated video!',
        url: this.generatedVideoUrl
      });
    } else {
      // Fallback: copy to clipboard
      if (this.generatedVideoUrl) {
        navigator.clipboard.writeText(this.generatedVideoUrl);
        this.snackBar.open('Video URL copied to clipboard!', 'Close', { duration: 3000 });
      }
    }
  }
  
  resetForm(): void {
    this.generateForm.reset({
      voice: 'female-professional',
      style: 'realistic',
      duration: 30
    });
    this.cleanupVideoUrl();
    this.resetGenerationSteps();
  }
  
  getStyleIcon(style: string): string {
    const iconMap: { [key: string]: string } = {
      realistic: 'photo_camera',
      animated: 'animation',
      minimal: 'crop_free',
      cinematic: 'movie',
      educational: 'school',
      abstract: 'brush'
    };
    return iconMap[style] || 'image';
  }
  
  getStyleLabel(styleValue: string): string {
    const style = this.videoStyles.find(s => s.value === styleValue);
    return style ? style.label : styleValue;
  }
  
  onVideoError(event: any): void {
    console.error('Video loading error:', event);
    this.snackBar.open('Error loading video preview. Please try regenerating.', 'Close', { duration: 5000 });
  }
  
  onVideoLoaded(): void {
    console.log('Video loaded successfully and ready to play');
  }
  
  playVoicePreview(voiceValue: string): void {
    if (this.isPlayingVoice === voiceValue) {
      // Stop current playback
      this.isPlayingVoice = null;
      return;
    }
    
    this.isPlayingVoice = voiceValue;
    
    // Use Speech Synthesis API for voice preview
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Hello! This is how your video will sound with this voice.');
      
      // Try to match voice characteristics
      const voices = speechSynthesis.getVoices();
      let selectedVoice = null;
      
      if (voiceValue.includes('british')) {
        selectedVoice = voices.find(voice => voice.lang.includes('en-GB'));
      } else if (voiceValue.includes('female')) {
        selectedVoice = voices.find(voice => voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('woman'));
      } else if (voiceValue.includes('male')) {
        selectedVoice = voices.find(voice => voice.name.toLowerCase().includes('male') || voice.name.toLowerCase().includes('man'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.onend = () => {
        this.isPlayingVoice = null;
      };
      
      utterance.onerror = () => {
        this.isPlayingVoice = null;
        this.snackBar.open('Voice preview not available', 'Close', { duration: 2000 });
      };
      
      speechSynthesis.speak(utterance);
    } else {
      this.isPlayingVoice = null;
      this.snackBar.open('Voice preview not supported in this browser', 'Close', { duration: 3000 });
    }
  }
}
