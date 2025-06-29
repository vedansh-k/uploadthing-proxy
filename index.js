import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
const upload = multer();

// Hardcoded UploadThing credentials
const UPLOADTHING_SECRET = 'sk_live_9be9261ce6fcff583669d699f6e1bec1a5463d2e844ebb1e783333f57f358a89';
const UPLOADTHING_APP_ID = 'nusm7w3jrh';

// Upload endpoint
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

  const fileKeyOnly = fields.key;
  const proxyViewUrl = `https://${req.headers.host}/view/${fileKeyOnly}`;

  res.json({ url: proxyViewUrl });
});

// View/download endpoint
app.get("/view/:key", async (req, res) => {
  const fileKey = req.params.key;
  const fileUrl = `https://utfs.io/f/${fileKey}`;

  try {
    const fileResponse = await fetch(fileUrl);
    const buffer = await fileResponse.buffer();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="quote.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch file" });
  }
});

app.listen(3000, () => console.log("Proxy running on port 3000"));