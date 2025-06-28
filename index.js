import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
const upload = multer();

const UPLOADTHING_SECRET = 'sk_live_9be9261ce6fcff583669d699f6e1bec1a5463d2e844ebb1e783333f57f358a89';
const UPLOADTHING_APP_ID = 'nusm7w3jrh';

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Missing file" });

  const createRes = await fetch("https://uploadthing.com/api/uploadFiles", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${UPLOADTHING_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: [{ name: req.file.originalname, type: req.file.mimetype }],
      appId: UPLOADTHING_APP_ID
    })
  });

  const createData = await createRes.json();
  if (!createData.success) return res.status(500).json({ error: createData.error });

  const fileKey = Object.keys(createData.data)[0];
  const { url, fields } = createData.data[fileKey];

  const form = new FormData();
  for (let key in fields) form.append(key, fields[key]);
  form.append("file", req.file.buffer, req.file.originalname);

  const s3Res = await fetch(url, {
    method: "POST",
    body: form,
  });

  if (!s3Res.ok) return res.status(500).json({ error: "S3 upload failed" });

  const finalUrl = `https://utfs.io/f/${fields.key}`;
  res.json({ url: finalUrl });
});

app.listen(3000, () => console.log("Proxy running on port 3000"));