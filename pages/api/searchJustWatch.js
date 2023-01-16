import { exec } from "child_process";

export default function handler(req, res) {
    // console.log(req.query)
    const { title, person } = req.query;
    let query

    if (title && person) {
        res.status(400).json({ error: "Only one of title or person can be specified" });
        return;
    }

    if (!title && !person) {
        res.status(400).json({ error: "Missing title or person" });
        return;
    }

    if (title) {
        query = "-t " + title
    }
    if (person) {
        query = "-p " + person
    }

    exec("python3 ./utils/searchJustWatch.py " + query, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        
        console.log(`stdout: ${stdout}`);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(stdout);
    });

    // res.status(200).json("nic nebude");
}
