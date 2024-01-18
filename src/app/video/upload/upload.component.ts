import { Component, OnDestroy } from '@angular/core';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/compat/storage';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { combineLatest, forkJoin, last, switchMap } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app'
import { ClipService } from 'src/app/services/clip.service';
import { Router } from '@angular/router';
import { FfmpegService } from 'src/app/services/ffmpeg.service';
import { log } from 'console';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnDestroy {

  constructor(
    private storage: AngularFireStorage,
    private auth: AngularFireAuth,
    private clipService: ClipService,
    private router: Router,
    public ffmpegService: FfmpegService
  ) {
    auth.user.subscribe(user => this.user = user);
    this.ffmpegService.init();
  }

  isDragover = false;
  file: File | null = null;
  nextStep = false;
  showAlert = false;
  alertMsg = "Please wait! Your clip is being uploaded.";
  alertColor = "blue";
  inSubmission = false;
  percentage = 0;
  showPercentage = false;
  user: firebase.User | null = null;
  task?: AngularFireUploadTask;
  screenshotTask?: AngularFireUploadTask;
  screenshots: string[] = [];
  selectedScreenshot = '';

  title = new FormControl('', {
    validators: [
      Validators.required,
      Validators.minLength(3)
    ],
    nonNullable: true
  });

  uploadForm = new FormGroup({
    title: this.title
  });

  async storeFile($event: Event) {
    if (this.ffmpegService.isRunning) {
      return;
    }

    this.isDragover = false;
    this.file = ($event as DragEvent).dataTransfer ? ($event as DragEvent).dataTransfer?.files.item(0) ?? null : ($event.target as HTMLInputElement).files?.item(0) ?? null;

    if (!this.file || this.file.type !== 'video/mp4') {
      return
    }

    this.screenshots = await this.ffmpegService.getScreenshots(this.file);

    this.selectedScreenshot = this.screenshots[0];

    this.title.setValue(this.file.name.replace(/\.[^/.]+$/, ''));
    this.nextStep = true;
  }

  async uploadFile() {
    this.uploadForm.disable();
    this.showAlert = true;
    this.alertColor = "blue";
    this.alertMsg = "Please wait! Your clip is being uploaded."
    this.inSubmission = true;
    this.showPercentage = true;

    const clipFileName = uuid();
    const clipPath = `clips/${clipFileName}.mp4`;

    const screenshotBlob = await this.ffmpegService.blogFromUrl(this.selectedScreenshot);

    const screenshotPath = `screenshots/${clipFileName}.png`;

    this.task = this.storage.upload(clipPath, this.file);
    const clipRef = this.storage.ref(clipPath);

    this.screenshotTask = this.storage.upload(screenshotPath, screenshotBlob);
    const screenshotRef = this.storage.ref(screenshotPath);

    combineLatest([this.task.percentageChanges(), this.screenshotTask.percentageChanges()]).subscribe((progress) => {
      const [clipProgress, screenshotsProgress] = progress;

      if (!clipProgress || !screenshotsProgress) {
        return;
      }

      const total = clipProgress + screenshotsProgress;

      this.percentage = total as number / 200;
    });

    forkJoin([
      this.task.snapshotChanges(),
      this.screenshotTask.percentageChanges()
    ]).pipe(
      switchMap(() => forkJoin([
        screenshotRef.getDownloadURL(),
        clipRef.getDownloadURL()
      ]))
    ).subscribe({
      next: async (urls) => {
        const [screenshotURL, clipURL] = urls;

        const clip = {
          uid: this.user?.uid as string,
          displayName: this.user?.displayName as string,
          title: this.title.value,
          fileName: `${clipFileName}.mp4`,
          url: clipURL,
          screenshotURL,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          screenshotFileName: `${clipFileName}.png`
        }

        const clipDocRef = await this.clipService.createClip(clip);

        this.alertColor = 'green';
        this.alertMsg = 'Success! Your clip is now ready to share with the world!';
        this.showPercentage = false;

        setTimeout(() => {
          this.router.navigate([
            'clip',
            clipDocRef.id,
          ])
        }, 1000)
      },
      error: (error) => {
        this.uploadForm.enable();
        this.alertColor = "red";
        this.alertMsg = "Upload failed! Please try again later.";
        this.inSubmission = true;
        this.showPercentage = false;
        console.error(error);
      }
    })
  }

  ngOnDestroy(): void {
    this.task?.cancel();
  }
}
