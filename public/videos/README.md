# Video Assets

Place your video files in this directory:

- `hero-background.mp4` - Main hero section background video

## Recommended Video Specifications:

- Format: MP4 (H.264)
- Resolution: 1920x1080 or higher
- File size: Keep under 10MB for faster loading
- Duration: 10-30 seconds (loop)
- Frame rate: 24-30 fps

## Alternative Video Sources:

You can also use external video URLs by updating the video source in the component:
```jsx
<source src="https://example.com/your-video.mp4" type="video/mp4" />
```

## Fallback Image:

Consider adding a poster attribute to the video tag for a fallback image:
```jsx
<video poster="/images/hero-poster.jpg" ...>
```