## JSON
```
curl -sSf -o custom.json -H 'Content-Type: application/json' \
  -d '{"pretty":true,"data":{"company":"MyStartup","active":true}}' \
  http://localhost:3000/api/v1/json
```

- With defaults (pretty true, random data):
```
curl -sSf -o file.json --json '{}' http://localhost:3000/api/v1/json
```

## PDF
```
curl -sSf -o sample.pdf --json '{
  "title":"Demo Document",
  "fontSize":16,
  "lines":10,
  "texts":["This is line 1","This is line 2"]
}' http://localhost:3000/api/v1/pdf
```

## TXT
```
curl -sSf -o sample.txt --json '{
  "lines":5,
  "texts":["This is line 1","This is line 2"]
}' http://localhost:3000/api/v1/txt
```

## DOCX
```
curl -sSf -o sample.docx --json '{
  "lines":10,
  "texts":["This is line 1","This is line 2"]
}' http://localhost:3000/api/v1/docx
```

## PPTX
```
curl -sSf -o sample.pptx --json '{
  "slides": {
    "Intro": { "lines":3, "texts":["Welcome","Agenda","Notes"] },
    "Team": { "lines":4 },
    "Summary": { "lines":5, "texts":["Point A","Point B"] }
  }
}' http://localhost:3000/api/v1/pptx
```

## XLSX
```
curl -sSf -o sample.xlsx --json '{
  "sheets": {
    "Employees": { "rows":5 },
    "CustomData": {
      "rows":6,
      "texts":[
        ["Alice","alice@example.com"],
        ["Bob","bob@example.com"]
      ]
    }
  }
}' http://localhost:3000/api/v1/xlsx
```

## CSV
- With explicit data:
```
curl -sSf -o sample.csv --json '{
  "data":[
    { "name":"Alice", "email":"alice@example.com" },
    { "name":"Bob",   "email":"bob@example.com" }
  ]
}' http://localhost:3000/api/v1/csv
```

- With default faker rows (e.g., 5):
```
curl -sSf -o file.csv --json '{}' http://localhost:3000/api/v1/csv
```

## Images
- JPG default:
```
curl -sSf -o sample.jpg -X POST http://localhost:3000/api/v1/images/jpg
```

- PNG default:
```
curl -sSf -o sample.png -X POST http://localhost:3000/api/v1/images/png
```

- Custom image (e.g., 640x360 WEBP):
```
curl -sSf -o image.webp --json '{
  "create": { "width":640, "height":360 },
  "output": { "format":"webp" }
}' http://localhost:3000/api/v1/images/custom
```

## Audio
- WAV 1s:
```
curl -sSf -o sample.wav --json '{ "lengthSeconds": 1 }' \
  http://localhost:3000/api/v1/audio/wav
```

- MP3 2s:
```
curl -sSf -o sample.mp3 --json '{ "lengthSeconds": 2 }' \
  http://localhost:3000/api/v1/audio/mp3
```

## Video
- Defaults (1s, 1280x720, black):
```
curl -sSf -o sample.mp4 --json '{}' http://localhost:3000/api/v1/video/mp4
```

- Custom (3s, 1920x1080, 30fps, gray bg, CRF 20, yuv420p, fast):
```
curl -sSf -o video.mp4 --json '{
  "duration":3,
  "resolution":"1920x1080",
  "fps":30,
  "background":"gray",
  "crf":20,
  "pixelFormat":"yuv420p",
  "preset":"fast",
  "silentAudio": true
}' http://localhost:3000/api/v1/video/mp4
```

## Archives
> Note: The zip/rar endpoints expect server-side-readable paths; pass absolute paths or paths accessible in the server container/host.

- ZIP selected files:
```
curl -sSf -o sample.zip --json '{
  "files": [
    "/absolute/path/output/custom.json",
    "/absolute/path/output/sample.pdf"
  ]
}' http://localhost:3000/api/v1/archives/zip
```

- RAR (if rar binary available in PATH; override with rarPath if needed):
```
curl -sSf -o sample.rar --json '{
  "files": [
    "/absolute/path/output/custom.json",
    "/absolute/path/output/sample.pdf"
  ],
  "rarPath": "rar"
}' http://localhost:3000/api/v1/archives/rar
```
