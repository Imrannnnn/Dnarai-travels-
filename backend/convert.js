import csv from "csvtojson";
import fs from "fs";

csv({
    noheader: true,
    output: "json"
})
    .fromFile("airports.dat")
    .then((jsonArray) => {

        const formatted = jsonArray
            .filter(row => row.field5 !== "\\N") // remove no IATA
            .map((row) => ({
                airport_name: row.field2,
                city: row.field3,
                country: row.field4,
                iata: row.field5,
                icao: row.field6,
                latitude: row.field7,
                longitude: row.field8
            }));

        fs.writeFileSync(
            "airports.json",
            JSON.stringify(formatted, null, 2)
        );

        console.log("✅ Converted to airports.json");
    });
