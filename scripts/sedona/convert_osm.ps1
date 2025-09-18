Param(
    [Parameter(Mandatory = $true)] [string]$InputPbf,
    [Parameter(Mandatory = $true)] [string]$OutputGeoJson
)

Write-Host "Converting $InputPbf -> $OutputGeoJson"

$ogr2ogr = "ogr2ogr"
& $ogr2ogr -f GeoJSON -where "highway IS NOT NULL" $OutputGeoJson $InputPbf

Write-Host "wrote $OutputGeoJson"
