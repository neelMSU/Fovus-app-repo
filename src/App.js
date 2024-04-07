import React, { useState } from 'react';
import './App.css';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function App() {

  const reg="us-east-2";
  const url='https://504sv5avxb.execute-api.us-east-2.amazonaws.com/prod/upload';
  const pln='text/plain';
  const jsn='application/json';

  const [file, setFile] = useState(null);
  const [txtInp, setTxtInp] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const FileChange = (event) => setFile(event.target.files[0]);
  const TextInputChange = (event) => setTxtInp(event.target.value);
  const s3client = new S3Client({ region: reg });



  const uploadS3 = async (file, { uploadURL }) => {
    try {
      const response = await fetch(uploadURL, 
        {
        method: 'PUT',body: file,headers: {'Content-Type': pln,},
      });

      if (!response.ok) throw new Error('Apologies, but file was not sent to S3');
      setMsg('File was sent to S3 successfully');
    } 
    catch (error) 
    {
      setMsg('Failed to upload file.');
      console.error('Error uploading file to S3:', error);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      const apiResponse = await fetch(url, 
      {
        body: JSON.stringify({ txtInp, fileName: file?.name }),method: 'POST',headers: {'Content-Type': jsn,},
      });

      const data = await apiResponse.json();
      await uploadS3(file, data); 
    } 
    catch (error) 
    {
      console.error('Error:', error);
    } 
    finally
    {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        {loading ? <p>Please wait, file is getting uploaded...</p> : (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={txtInp}
              onChange={TextInputChange}
              placeholder="Enter text please"
            />
            <input
              type="file"
              onChange={FileChange}
            />
            <button type="submit">Upload</button>
          </form>
        )}
        <p>{msg}</p>
      </header>
    </div>
  );
}

export default App;
