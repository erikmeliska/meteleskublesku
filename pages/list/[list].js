import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { saveAs } from "file-saver";
import axios from "axios";
import { Container, IconButton, Modal, Table, TableBody, TableCell, TableRow, Tooltip, Typography } from "@mui/material";
import { FileDownload, FileUpload, PhotoCamera, Save, Visibility, VisibilityOff } from "@mui/icons-material";

export default function List() {
	const [listData, setListData] = useState([]);
	const [seen, setSeen] = useState({});
	const [showPhoto, setShowPhoto] = useState(false);
	const [showPhotoUrl, setShowPhotoUrl] = useState(null);
	const router = useRouter();
	const { list } = router.query;

	// get seen from local storage
	useEffect(() => {
		const seen = localStorage.getItem('seen');
		if (seen) {
			setSeen(JSON.parse(seen));
		}
	}, []);

	// save seen to local storage
	useEffect(() => {
		// if seen is empty object
		if (Object.keys(seen).length === 0 && seen.constructor === Object) {
			return;
		}

		localStorage.setItem('seen', JSON.stringify(seen));

	}, [seen]);

	useEffect(() => {
		if (list) {
			const fetchList = async () => {
				const res = await axios.get(`/imdb-${list}.json`);
				setListData(res.data.items);
			};
			fetchList();

			// if seen for this list is not set, set it to empty array
			if (!seen[list]) {
				setSeen(oldSeen => ({ ...oldSeen, [list]: [] }));
			}
		}
	}, [list]);

	const camelCaseToString = (str) => {
		let newString = str.replace(/([A-Z0-9]+)/g, (match) => {
			return match.replace(/([0-9]+)/g, ' $1 ')
		});
		newString = newString.charAt(0).toUpperCase() + newString.slice(1);
		return newString.replace(/([A-Z][a-z0-9]+)/g, ' $1')
	};
	
	

	const handleShowPhoto = (id) => {
		const item = listData.find(item => item.id === id);
		setShowPhotoUrl(item.image);
		setShowPhoto(true);
	};

	const handleSave = () => {
		// add "all" to seen, which combines all unique seen items
		const allSeen = [... new Set(Object.values(seen).flat())];
		// save seen to download file
		const seenString = JSON.stringify({ ...seen, all: allSeen });
		const blob = new Blob([seenString], { type: "application/json" });
		saveAs(blob, "seen.json");
	};

	const handleImport = () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "application/json";
		input.onchange = (e) => {
			const file = e.target.files[0];
			const reader = new FileReader();
			reader.onload = (e) => {
				const seen = JSON.parse(e.target.result);
				setSeen(seen);
			};
			reader.readAsText(file);
		};
		input.click();
	};

	const handleSeenToggle = (id) => {
		if (seen[list].includes(id)) {
			// setSeen(oldSeen => oldSeen.filter(item => item !== id));
			setSeen(oldSeen => ({ ...oldSeen, [list]: oldSeen[list].filter(item => item !== id) }));
			return;
		}
		// setSeen(oldSeen => [... new Set([...oldSeen, id])]);
		setSeen(oldSeen => ({ ...oldSeen, [list]: [... new Set([...oldSeen[list], id])] }));
	};
	
    return (
		<>
		{list &&
		<Container>
			<Typography variant="h3" sx={{ my: 2 }}>{camelCaseToString(list)}</Typography>
			<Tooltip title="Save seen to file">
				<IconButton onClick={handleSave}>
					<FileDownload />
				</IconButton>
			</Tooltip>
			<Tooltip title="Import seen from file">
				<IconButton onClick={handleImport}>
					<FileUpload />
				</IconButton>
			</Tooltip>

			<Table size="small">
				<TableBody>
					{listData && listData.map((item) => (
						<TableRow key={item.id} selected={seen[list].includes(item.id)}>
							<TableCell>{item.rank}</TableCell>
							<TableCell>{item.title}</TableCell>
							<TableCell>{item.year}</TableCell>
							<TableCell>{item.imDbRating}</TableCell>
							<TableCell onClick={()=>handleSeenToggle(item.id)}>{seen[list].includes(item.id) ? <VisibilityOff /> : <Visibility />}</TableCell>
							<TableCell onClick={()=>handleShowPhoto(item.id)}><PhotoCamera /></TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<Modal open={showPhoto} onClose={()=>setShowPhoto(false)}>
				<img src={showPhotoUrl} height="100%" alt="photo" />
			</Modal>
		</Container>
		}
		</>
	);
	

}
